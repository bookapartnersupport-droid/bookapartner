create index if not exists idx_bookings_response_deadline on public.bookings(status, partner_response_deadline);
create index if not exists idx_bookings_start_time on public.bookings(booking_date, booking_time);
create index if not exists idx_bookings_customer_status on public.bookings(customer_id, status);
create index if not exists idx_bookings_partner_status on public.bookings(partner_id, status);
create index if not exists idx_change_requests_booking_status on public.booking_change_requests(booking_id, status);
create index if not exists idx_extensions_booking_status on public.booking_extensions(booking_id, status);
create index if not exists idx_reviews_reviewee_status on public.reviews(reviewee_user_id, moderation_status);
create index if not exists idx_complaints_booking_status on public.complaints(booking_id, status);
create unique index if not exists ux_refunds_booking_reason on public.refunds(booking_id, reason);

create or replace function public.bap_refund_percent(p_booking_status text, p_cancelled_by text, p_booking_date date, p_booking_time time, p_now timestamptz default now()) returns integer language plpgsql stable as $$
declare starts_at timestamptz; hours_left numeric;
begin
  if p_booking_status='requested' or p_cancelled_by in ('partner','admin') then return 100; end if;
  if p_cancelled_by <> 'customer' or p_booking_date is null or p_booking_time is null then return 0; end if;
  starts_at := (p_booking_date::text || ' ' || p_booking_time::text)::timestamptz;
  hours_left := extract(epoch from (starts_at-p_now))/3600.0;
  if hours_left>=24 then return 100; elsif hours_left>=12 then return 75; elsif hours_left>=6 then return 50; else return 0; end if;
end; $$;

create or replace function public.bap_guard_booking_update() returns trigger language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); admin_actor boolean:=false; partner_actor boolean:=false;
begin
  if uid is null then return new; end if;
  select exists(select 1 from public.user_profiles where id=uid and role='admin') into admin_actor;
  if admin_actor then return new; end if;
  select exists(select 1 from public.partners where id=old.partner_id and user_id=uid) into partner_actor;
  if old.customer_id=uid then
    if new.id is distinct from old.id or new.customer_id is distinct from old.customer_id or new.partner_id is distinct from old.partner_id or new.service is distinct from old.service or new.partner_gender_preference is distinct from old.partner_gender_preference or new.preferred_age is distinct from old.preferred_age or new.city is distinct from old.city or new.area is distinct from old.area or new.meeting_location is distinct from old.meeting_location or new.booking_date is distinct from old.booking_date or new.booking_time is distinct from old.booking_time or new.partner_rate is distinct from old.partner_rate or new.transport_charge is distinct from old.transport_charge or new.total_amount is distinct from old.total_amount or new.status is distinct from old.status or new.payment_status is distinct from old.payment_status or new.payout_status is distinct from old.payout_status or new.meeting_otp_hash is distinct from old.meeting_otp_hash or new.meeting_verified_at is distinct from old.meeting_verified_at or new.accepted_at is distinct from old.accepted_at or new.rejected_at is distinct from old.rejected_at or new.cancelled_at is distinct from old.cancelled_at or new.cancelled_by is distinct from old.cancelled_by or new.cancellation_reason is distinct from old.cancellation_reason or new.started_at is distinct from old.started_at or new.completed_at is distinct from old.completed_at or new.completion_confirmation_deadline is distinct from old.completion_confirmation_deadline or new.partner_response_deadline is distinct from old.partner_response_deadline then raise exception 'booking_state_change_requires_authorized_action'; end if;
  elsif partner_actor then
    if new is distinct from old then raise exception 'partner_booking_update_requires_authorized_action'; end if;
  else
    raise exception 'booking_update_forbidden';
  end if;
  return new;
end; $$;
drop trigger if exists trg_bap_guard_booking_update on public.bookings;
create trigger trg_bap_guard_booking_update before update on public.bookings for each row execute function public.bap_guard_booking_update();

create or replace function public.bap_guard_partner_application_update() returns trigger language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); admin_actor boolean:=false;
begin
  if uid is null then return new; end if;
  select exists(select 1 from public.user_profiles where id=uid and role='admin') into admin_actor;
  if admin_actor then return new; end if;
  if old.user_id<>uid then raise exception 'application_update_forbidden'; end if;
  if new.verification_status is distinct from old.verification_status or new.verification_call_completed is distinct from old.verification_call_completed or new.verification_notes is distinct from old.verification_notes or new.approved_at is distinct from old.approved_at or new.rejected_at is distinct from old.rejected_at then raise exception 'verification_fields_are_admin_only'; end if;
  return new;
end; $$;
drop trigger if exists trg_bap_guard_partner_application_update on public.partner_applications;
create trigger trg_bap_guard_partner_application_update before update on public.partner_applications for each row execute function public.bap_guard_partner_application_update();

create or replace function public.bap_guard_payout_account_update() returns trigger language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); admin_actor boolean:=false;
begin
  if uid is null then return new; end if;
  select exists(select 1 from public.user_profiles where id=uid and role='admin') into admin_actor;
  if admin_actor then return new; end if;
  if old.user_id<>uid then raise exception 'payout_account_update_forbidden'; end if;
  if new.verification_status is distinct from old.verification_status or new.provider_reference is distinct from old.provider_reference or new.active is distinct from old.active then raise exception 'payout_account_verification_fields_are_backend_only'; end if;
  return new;
end; $$;
drop trigger if exists trg_bap_guard_payout_account_update on public.payout_accounts;
create trigger trg_bap_guard_payout_account_update before update on public.payout_accounts for each row execute function public.bap_guard_payout_account_update();

create or replace function public.bap_validate_review() returns trigger language plpgsql security definer set search_path=public as $$
declare b public.bookings%rowtype; partner_user uuid; uid uuid:=auth.uid(); admin_actor boolean:=false;
begin
  if uid is null or new.reviewer_user_id<>uid then raise exception 'reviewer_must_match_authenticated_user'; end if;
  select * into b from public.bookings where id=new.booking_id;
  select p.user_id into partner_user from public.partners p where p.id=b.partner_id;
  if not found or b.status<>'completed' then raise exception 'reviews_require_completed_booking'; end if;
  if new.reviewer_user_id not in (b.customer_id,partner_user) then raise exception 'reviewer_not_booking_participant'; end if;
  if new.reviewee_user_id=new.reviewer_user_id then raise exception 'cannot_review_self'; end if;
  if new.reviewee_user_id not in (b.customer_id,partner_user) then raise exception 'reviewee_not_booking_participant'; end if;
  select exists(select 1 from public.user_profiles where id=uid and role='admin') into admin_actor;
  if not admin_actor then new.moderation_status:='pending'; end if;
  return new;
end; $$;
drop trigger if exists trg_bap_validate_review on public.reviews;
create trigger trg_bap_validate_review before insert on public.reviews for each row execute function public.bap_validate_review();

create or replace function public.bap_apply_complaint_hold() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.booking_id is not null and (new.payout_hold or new.severity in ('serious','critical') or new.status in ('open','under_review','escalated')) then
    update public.bookings set payout_status='on_hold',updated_at=now() where id=new.booking_id and payout_status<>'released';
  end if;
  return new;
end; $$;
drop trigger if exists trg_bap_apply_complaint_hold on public.complaints;
create trigger trg_bap_apply_complaint_hold after insert or update of payout_hold,severity,status on public.complaints for each row execute function public.bap_apply_complaint_hold();

create or replace function public.bap_apply_dispute_hold() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.booking_id is not null and new.status in ('open','under_review') then
    update public.bookings set status='disputed',payout_status='on_hold',issue_reported=true,updated_at=now() where id=new.booking_id and status not in ('cancelled','rejected');
  end if;
  return new;
end; $$;
drop trigger if exists trg_bap_apply_dispute_hold on public.disputes;
create trigger trg_bap_apply_dispute_hold after insert or update of status on public.disputes for each row execute function public.bap_apply_dispute_hold();

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
revoke all on function public.bap_refund_percent(text,text,date,time,timestamptz) from public,anon;
grant execute on function public.bap_refund_percent(text,text,date,time,timestamptz) to authenticated,service_role;
revoke all on function public.bap_guard_booking_update() from public,anon,authenticated;
revoke all on function public.bap_guard_partner_application_update() from public,anon,authenticated;
revoke all on function public.bap_guard_payout_account_update() from public,anon,authenticated;
revoke all on function public.bap_validate_review() from public,anon,authenticated;
revoke all on function public.bap_apply_complaint_hold() from public,anon,authenticated;
revoke all on function public.bap_apply_dispute_hold() from public,anon,authenticated;
