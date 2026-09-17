-- Book A Partner backend core entities. Additive only; preserves existing tables/data.
-- Applied to Supabase project book-a-partner as migration backend_core_entities_and_security.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id), action text not null, entity_type text, entity_id uuid,
  reason text, before_data jsonb, after_data jsonb, ip_address inet, user_agent text,
  created_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, title text not null, body text, booking_id uuid references public.bookings(id) on delete set null,
  data jsonb not null default '{}'::jsonb, priority text not null default 'normal', read_at timestamptz,
  delivered_at timestamptz, delivery_status text not null default 'pending', created_at timestamptz not null default now()
);
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null unique references public.bookings(id) on delete cascade,
  created_at timestamptz not null default now(), closed_at timestamptz
);
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade, message text not null,
  attachment_path text, attachment_mime_type text, attachment_size bigint, sent_at timestamptz not null default now(),
  delivered_at timestamptz, read_at timestamptz, deleted_at timestamptz
);
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete cascade, reviewee_user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5), review_text text,
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected','hidden')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (booking_id, reviewer_user_id)
);
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(), booking_id uuid references public.bookings(id) on delete set null,
  reporter_user_id uuid not null references auth.users(id), reported_user_id uuid references auth.users(id),
  category text not null, description text not null, status text not null default 'open' check (status in ('open','under_review','resolved','rejected','escalated')),
  severity text not null default 'normal', evidence jsonb not null default '[]'::jsonb, payout_hold boolean not null default false,
  resolution text, resolved_by uuid references auth.users(id), resolved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.financial_ledger (
  id uuid primary key default gen_random_uuid(), booking_id uuid references public.bookings(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null, entry_type text not null,
  direction text not null check (direction in ('credit','debit')), amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'INR', status text not null default 'pending', provider text, provider_reference text,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete cascade,
  requested_by uuid references auth.users(id), amount numeric(12,2) not null check (amount >= 0), reason text not null,
  status text not null default 'pending' check (status in ('pending','processing','succeeded','failed','cancelled')),
  provider text, provider_reference text, requested_at timestamptz not null default now(), processed_at timestamptz, failure_reason text
);
create table if not exists public.payout_accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  account_type text not null check (account_type in ('bank','upi')), account_holder_name text, masked_account text,
  provider_reference text, verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete cascade,
  partner_id uuid not null references public.partners(id), gross_amount numeric(12,2) not null check (gross_amount >= 0),
  commission_amount numeric(12,2) not null default 0 check (commission_amount >= 0), net_amount numeric(12,2) not null check (net_amount >= 0),
  status text not null default 'not_eligible' check (status in ('not_eligible','eligible','processing','paid','failed','on_hold')),
  hold_reason text, provider text, provider_reference text, eligible_at timestamptz, processed_at timestamptz,
  failure_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (booking_id)
);
create table if not exists public.booking_change_requests (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete cascade,
  requested_by uuid not null references auth.users(id), requested_date date, requested_time time, requested_duration integer,
  requested_location text, note text, status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  responded_by uuid references auth.users(id), responded_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.booking_extensions (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete cascade,
  requested_by uuid not null references auth.users(id), extra_duration integer not null check (extra_duration > 0),
  extra_amount numeric(12,2) not null check (extra_amount >= 0), status text not null default 'pending' check (status in ('pending','accepted','rejected','paid','cancelled')),
  payment_reference text, created_at timestamptz not null default now(), responded_at timestamptz
);
create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(), blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade, reason text, created_at timestamptz not null default now(),
  unique (blocker_user_id, blocked_user_id), check (blocker_user_id <> blocked_user_id)
);
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','blocked','approved','processing','completed','rejected')),
  reason text, blocking_items jsonb not null default '[]'::jsonb, requested_at timestamptz not null default now(),
  processed_at timestamptz, processed_by uuid references auth.users(id)
);

alter table public.bookings add column if not exists partner_response_deadline timestamptz;
alter table public.bookings add column if not exists accepted_at timestamptz;
alter table public.bookings add column if not exists rejected_at timestamptz;
alter table public.bookings add column if not exists cancelled_at timestamptz;
alter table public.bookings add column if not exists cancelled_by uuid references auth.users(id);
alter table public.bookings add column if not exists cancellation_reason text;
alter table public.bookings add column if not exists started_at timestamptz;
alter table public.bookings add column if not exists completed_at timestamptz;
alter table public.bookings add column if not exists completion_confirmation_deadline timestamptz;
alter table public.bookings add column if not exists customer_meeting_ok boolean;
alter table public.bookings add column if not exists issue_category text;

create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_chat_messages_thread_sent on public.chat_messages(thread_id, sent_at);
create index if not exists idx_complaints_status_created on public.complaints(status, created_at desc);
create index if not exists idx_ledger_booking_created on public.financial_ledger(booking_id, created_at);
create index if not exists idx_payouts_status_eligible on public.payouts(status, eligible_at);
create index if not exists idx_audit_logs_entity_created on public.audit_logs(entity_type, entity_id, created_at desc);

alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.reviews enable row level security;
alter table public.complaints enable row level security;
alter table public.financial_ledger enable row level security;
alter table public.refunds enable row level security;
alter table public.payout_accounts enable row level security;
alter table public.payouts enable row level security;
alter table public.booking_change_requests enable row level security;
alter table public.booking_extensions enable row level security;
alter table public.blocked_users enable row level security;
alter table public.account_deletion_requests enable row level security;

create policy "notifications own read" on public.notifications for select to authenticated using (user_id = auth.uid() or is_admin());
create policy "notifications own update" on public.notifications for update to authenticated using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());
create policy "chat threads participant read" on public.chat_threads for select to authenticated using (exists (select 1 from public.bookings b join public.partners p on p.id=b.partner_id where b.id=chat_threads.booking_id and (b.customer_id=auth.uid() or p.user_id=auth.uid())) or is_admin());
create policy "chat messages participant read" on public.chat_messages for select to authenticated using (exists (select 1 from public.chat_threads t join public.bookings b on b.id=t.booking_id join public.partners p on p.id=b.partner_id where t.id=chat_messages.thread_id and (b.customer_id=auth.uid() or p.user_id=auth.uid())) or is_admin());
create policy "chat messages participant insert" on public.chat_messages for insert to authenticated with check (sender_user_id=auth.uid() and exists (select 1 from public.chat_threads t join public.bookings b on b.id=t.booking_id join public.partners p on p.id=b.partner_id where t.id=chat_messages.thread_id and (b.customer_id=auth.uid() or p.user_id=auth.uid())));
create policy "reviews approved read" on public.reviews for select to authenticated using (moderation_status='approved' or reviewer_user_id=auth.uid() or reviewee_user_id=auth.uid() or is_admin());
create policy "reviews own insert" on public.reviews for insert to authenticated with check (reviewer_user_id=auth.uid());
create policy "reviews own update" on public.reviews for update to authenticated using (reviewer_user_id=auth.uid() or is_admin()) with check (reviewer_user_id=auth.uid() or is_admin());
create policy "complaints participant read" on public.complaints for select to authenticated using (reporter_user_id=auth.uid() or reported_user_id=auth.uid() or is_admin());
create policy "complaints own insert" on public.complaints for insert to authenticated with check (reporter_user_id=auth.uid());
create policy "complaints admin update" on public.complaints for update to authenticated using (is_admin()) with check (is_admin());
create policy "ledger participant read" on public.financial_ledger for select to authenticated using (user_id=auth.uid() or is_admin() or exists (select 1 from public.bookings b join public.partners p on p.id=b.partner_id where b.id=financial_ledger.booking_id and p.user_id=auth.uid()));
create policy "refund participant read" on public.refunds for select to authenticated using (requested_by=auth.uid() or is_admin() or exists (select 1 from public.bookings b join public.partners p on p.id=b.partner_id where b.id=refunds.booking_id and (b.customer_id=auth.uid() or p.user_id=auth.uid())));
create policy "payout own read" on public.payouts for select to authenticated using (partner_id in (select id from public.partners where user_id=auth.uid()) or is_admin());
create policy "payout account own read" on public.payout_accounts for select to authenticated using (user_id=auth.uid() or is_admin());
create policy "payout account own update" on public.payout_accounts for update to authenticated using (user_id=auth.uid() or is_admin()) with check (user_id=auth.uid() or is_admin());
create policy "change requests participant read" on public.booking_change_requests for select to authenticated using (requested_by=auth.uid() or is_admin() or exists (select 1 from public.bookings b join public.partners p on p.id=b.partner_id where b.id=booking_change_requests.booking_id and (b.customer_id=auth.uid() or p.user_id=auth.uid())));
create policy "change requests own insert" on public.booking_change_requests for insert to authenticated with check (requested_by=auth.uid());
create policy "change requests participant update" on public.booking_change_requests for update to authenticated using (requested_by=auth.uid() or is_admin() or exists (select 1 from public.bookings b join public.partners p on p.id=b.partner_id where b.id=booking_change_requests.booking_id and p.user_id=auth.uid())) with check (requested_by=auth.uid() or is_admin() or exists (select 1 from public.bookings b join public.partners p on p.id=b.partner_id where b.id=booking_change_requests.booking_id and p.user_id=auth.uid()));
create policy "extensions participant read" on public.booking_extensions for select to authenticated using (requested_by=auth.uid() or is_admin() or exists (select 1 from public.bookings b join public.partners p on p.id=b.partner_id where b.id=booking_extensions.booking_id and (b.customer_id=auth.uid() or p.user_id=auth.uid())));
create policy "extensions own insert" on public.booking_extensions for insert to authenticated with check (requested_by=auth.uid());
create policy "extensions participant update" on public.booking_extensions for update to authenticated using (requested_by=auth.uid() or is_admin() or exists (select 1 from public.bookings b join public.partners p on p.id=b.partner_id where b.id=booking_extensions.booking_id and p.user_id=auth.uid())) with check (requested_by=auth.uid() or is_admin() or exists (select 1 from public.bookings b join public.partners p on p.id=b.partner_id where b.id=booking_extensions.booking_id and p.user_id=auth.uid()));
create policy "blocks own read" on public.blocked_users for select to authenticated using (blocker_user_id=auth.uid() or blocked_user_id=auth.uid() or is_admin());
create policy "blocks own insert" on public.blocked_users for insert to authenticated with check (blocker_user_id=auth.uid());
create policy "blocks own delete" on public.blocked_users for delete to authenticated using (blocker_user_id=auth.uid() or is_admin());
create policy "deletion own read" on public.account_deletion_requests for select to authenticated using (user_id=auth.uid() or is_admin());
create policy "deletion own insert" on public.account_deletion_requests for insert to authenticated with check (user_id=auth.uid());
create policy "deletion admin update" on public.account_deletion_requests for update to authenticated using (is_admin()) with check (is_admin());
create policy "audit admin read" on public.audit_logs for select to authenticated using (is_admin());
revoke insert, update, delete on public.audit_logs from anon, authenticated;
revoke insert, update, delete on public.financial_ledger from anon, authenticated;
revoke insert, update, delete on public.refunds from anon, authenticated;
revoke insert, update, delete on public.payouts from anon, authenticated;
