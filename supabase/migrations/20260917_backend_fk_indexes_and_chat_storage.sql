-- Backend integrity/performance follow-up. Additive only.
create index if not exists idx_account_deletion_processed_by on public.account_deletion_requests(processed_by);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_user_id);
create index if not exists idx_blocked_users_blocked on public.blocked_users(blocked_user_id);
create index if not exists idx_change_requests_requested_by on public.booking_change_requests(requested_by);
create index if not exists idx_change_requests_responded_by on public.booking_change_requests(responded_by);
create index if not exists idx_extensions_requested_by on public.booking_extensions(requested_by);
create index if not exists idx_bookings_cancelled_by on public.bookings(cancelled_by);
create index if not exists idx_chat_messages_sender on public.chat_messages(sender_user_id);
create index if not exists idx_complaints_reported_user on public.complaints(reported_user_id);
create index if not exists idx_complaints_reporter on public.complaints(reporter_user_id);
create index if not exists idx_complaints_resolved_by on public.complaints(resolved_by);
create index if not exists idx_disputes_customer on public.disputes(customer_id);
create index if not exists idx_disputes_partner on public.disputes(partner_id);
create index if not exists idx_disputes_resolved_by on public.disputes(resolved_by);
create index if not exists idx_ledger_user on public.financial_ledger(user_id);
create index if not exists idx_notifications_booking on public.notifications(booking_id);
create index if not exists idx_partners_verified_by on public.partners(verified_by);
create index if not exists idx_payouts_partner on public.payouts(partner_id);
create index if not exists idx_refunds_requested_by on public.refunds(requested_by);
create index if not exists idx_reviews_reviewer on public.reviews(reviewer_user_id);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('chat-attachments','chat-attachments',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "chat attachments participant read" on storage.objects;
drop policy if exists "chat attachments participant insert" on storage.objects;
drop policy if exists "chat attachments participant delete" on storage.objects;
create policy "chat attachments participant read" on storage.objects for select to authenticated using (
  bucket_id='chat-attachments' and exists (
    select 1 from public.chat_messages m
    join public.chat_threads t on t.id=m.thread_id
    join public.bookings b on b.id=t.booking_id
    join public.partners p on p.id=b.partner_id
    where m.attachment_path=name and (b.customer_id=auth.uid() or p.user_id=auth.uid() or public.is_admin())
  )
);
create policy "chat attachments participant insert" on storage.objects for insert to authenticated with check (bucket_id='chat-attachments' and owner_id=auth.uid()::text);
create policy "chat attachments participant delete" on storage.objects for delete to authenticated using (bucket_id='chat-attachments' and (owner_id=auth.uid()::text or public.is_admin()));
