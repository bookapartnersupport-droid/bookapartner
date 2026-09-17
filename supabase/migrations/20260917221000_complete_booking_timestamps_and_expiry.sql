alter table public.bookings add column if not exists duration_hours integer not null default 1 check (duration_hours > 0);
alter table public.bookings add column if not exists arrived_at timestamptz;
alter table public.bookings add column if not exists late_arrival_at timestamptz;
alter table public.bookings add column if not exists partner_no_show_at timestamptz;
alter table public.bookings add column if not exists customer_no_show_at timestamptz;

alter table public.disputes drop constraint if exists disputes_status_check;
alter table public.disputes add constraint disputes_status_check check (status in ('open','under_review','appeal','escalated','resolved','closed'));
alter table public.payouts drop constraint if exists payouts_status_check;
alter table public.payouts add constraint payouts_status_check check (status in ('not_eligible','eligible','processing','paid','failed','on_hold','released'));
alter table public.refunds add column if not exists refund_percent integer;
alter table public.refunds drop constraint if exists refunds_refund_percent_check;
alter table public.refunds add constraint refunds_refund_percent_check check (refund_percent is null or refund_percent between 0 and 100);

create or replace function public.bap_expire_requested_bookings(p_now timestamptz default now()) returns integer language plpgsql security definer set search_path=public as $$
declare changed integer; r record; refund_amount numeric;
begin
  for r in select b.* from public.bookings b where b.status='requested' and b.partner_response_deadline is not null and b.partner_response_deadline<=p_now loop
    update public.bookings set status='rejected',rejected_at=p_now,updated_at=p_now,cancellation_reason='partner_response_timeout' where id=r.id and status='requested';
    if found then
      refund_amount:=round(coalesce(r.total_amount,0),2);
      if refund_amount>0 then
        insert into public.refunds(booking_id,requested_by,amount,refund_percent,reason,status) values(r.id,null,refund_amount,100,'partner_response_timeout','pending') on conflict (booking_id,reason) do nothing;
        insert into public.financial_ledger(booking_id,user_id,entry_type,direction,amount,status,metadata) values(r.id,r.customer_id,'refund_requested','credit',refund_amount,'pending',jsonb_build_object('reason','partner_response_timeout','refund_percent',100));
      end if;
      insert into public.notifications(user_id,type,title,body,booking_id,data,priority) values(r.customer_id,'booking_expired','Booking expired','The partner response window expired. Your eligible refund has been queued.',r.id,jsonb_build_object('refund_percent',100),'high');
      insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,reason,before_data,after_data) values(null,'booking.expire','booking',r.id,'partner_response_timeout',to_jsonb(r),(select to_jsonb(b2) from public.bookings b2 where b2.id=r.id));
    end if;
  end loop;
  get diagnostics changed=row_count;
  return changed;
end; $$;
revoke all on function public.bap_expire_requested_bookings(timestamptz) from public,anon,authenticated;
grant execute on function public.bap_expire_requested_bookings(timestamptz) to service_role;

create or replace function public.bap_finalize_due_bookings(p_now timestamptz default now()) returns integer language plpgsql security definer set search_path=public as $$
declare changed integer:=0; r record; gross numeric; commission numeric; net numeric; end_at timestamptz; deadline_at timestamptz;
begin
  for r in select b.*,p.id as pid from public.bookings b join public.partners p on p.id=b.partner_id where b.status in ('confirmed','accepted') and b.started_at is not null and b.booking_date is not null and b.booking_time is not null and not b.issue_reported loop
    end_at := (r.booking_date::text || ' ' || r.booking_time::text)::timestamptz + make_interval(hours=>coalesce(r.duration_hours,1));
    deadline_at := end_at + interval '1 hour';
    if r.completion_confirmation_deadline is null then update public.bookings set completion_confirmation_deadline=deadline_at,updated_at=p_now where id=r.id; end if;
    if p_now >= deadline_at then
      update public.bookings set status='completed',completed_at=coalesce(completed_at,end_at),customer_meeting_ok=coalesce(customer_meeting_ok,false),payout_status=case when payout_status='on_hold' then 'on_hold' else 'locked' end,updated_at=p_now where id=r.id and status in ('confirmed','accepted') and issue_reported=false;
      if found then
        changed:=changed+1; gross:=round(coalesce(r.total_amount,0),2); commission:=round(gross*0.15,2); net:=round(gross-commission,2);
        insert into public.payouts(booking_id,partner_id,gross_amount,commission_amount,net_amount,status,eligible_at) values(r.id,r.pid,gross,commission,net,'not_eligible',p_now+interval '6 hours') on conflict (booking_id) do update set gross_amount=excluded.gross_amount,commission_amount=excluded.commission_amount,net_amount=excluded.net_amount,eligible_at=coalesce(public.payouts.eligible_at,excluded.eligible_at),updated_at=p_now;
        insert into public.financial_ledger(booking_id,user_id,entry_type,direction,amount,status,metadata) values(r.id,null,'commission','credit',commission,'pending',jsonb_build_object('rate',0.15,'gross_amount',gross));
        insert into public.notifications(user_id,type,title,body,booking_id,data) values(r.customer_id,'booking_completed','Booking completed','Your booking was auto-completed after the confirmation window.',r.id,jsonb_build_object('payout_hold',r.payout_status='on_hold'),'normal');
      end if;
    end if;
  end loop;
  return changed;
end; $$;
revoke all on function public.bap_finalize_due_bookings(timestamptz) from public,anon,authenticated;
grant execute on function public.bap_finalize_due_bookings(timestamptz) to service_role;

create or replace function public.bap_release_due_payouts(p_now timestamptz default now()) returns integer language plpgsql security definer set search_path=public as $$
declare changed integer:=0;
begin
  update public.payouts p set status='eligible',updated_at=p_now where p.status='not_eligible' and p.eligible_at is not null and p.eligible_at<=p_now and not exists(select 1 from public.complaints c where c.booking_id=p.booking_id and c.status in ('open','under_review','escalated') and c.payout_hold=true) and not exists(select 1 from public.disputes d where d.booking_id=p.booking_id and d.status in ('open','under_review','appeal','escalated'));
  get diagnostics changed=row_count;
  update public.bookings b set payout_status='eligible',updated_at=p_now where b.id in (select p.booking_id from public.payouts p where p.status='eligible') and b.payout_status='locked';
  return changed;
end; $$;
revoke all on function public.bap_release_due_payouts(timestamptz) from public,anon,authenticated;
grant execute on function public.bap_release_due_payouts(timestamptz) to service_role;

create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid) from cron.job where jobname='bap-expire-bookings';
select cron.schedule('bap-expire-bookings','* * * * *','select public.bap_expire_requested_bookings(now());');
select cron.unschedule(jobid) from cron.job where jobname='bap-finalize-due-bookings';
select cron.schedule('bap-finalize-due-bookings','*/5 * * * *','select public.bap_finalize_due_bookings(now());');
select cron.unschedule(jobid) from cron.job where jobname='bap-release-due-payouts';
select cron.schedule('bap-release-due-payouts','*/5 * * * *','select public.bap_release_due_payouts(now());');
