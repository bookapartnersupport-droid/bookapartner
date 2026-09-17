# Book A Partner — Backend Implementation Status

Updated: 2026-09-17

## Source of truth
`BOOK_A_PARTNER_MASTER_HANDOFF.md` remains the canonical product/backend specification.

## Live Supabase audit
Project: `book-a-partner`
Ref: `wmawmdwjjbvlqsugthhe`
Region: `ap-south-1`
PostgreSQL: 17

Confirmed existing core tables: `user_profiles`, `partner_applications`, `partners`, `bookings`, `disputes`.

Confirmed private storage buckets:
- `partner-photos` — private, 5 MB, JPEG/PNG/WebP
- `partner-selfies` — private, 5 MB, JPEG/PNG/WebP
- `partner-proofs` — private, 10 MB, PDF/JPEG/PNG/WebP

Confirmed storage policies restrict objects to authenticated owners/admins; buckets remain private.

Confirmed existing public role model: `customer`, `partner`, `admin` through `user_profiles`.

Existing security-definer functions were audited. Anonymous execution is disabled for `is_admin()` and `rls_auto_enable()`. `rls_auto_enable()` is not executable by authenticated clients. `is_admin()` remains executable by authenticated sessions because existing RLS policies depend on it.

## Applied backend migration
Migration: `backend_core_entities_and_security`

Added additive production support entities:
- `audit_logs`
- `notifications`
- `chat_threads`
- `chat_messages`
- `reviews`
- `complaints`
- `financial_ledger`
- `refunds`
- `payout_accounts`
- `payouts`
- `booking_change_requests`
- `booking_extensions`
- `blocked_users`
- `account_deletion_requests`

Added booking lifecycle timestamps needed by server workflows without replacing existing status values.

All new tables have RLS enabled and participant/admin-scoped policies. Financial ledger, refund, payout and audit writes are not available to anon/authenticated clients; privileged backend paths are responsible for those writes.

## Edge Functions
There were no Edge Functions before this batch.

Deployed:
- `booking-actions` — JWT required.

Current server-side actions:
- partner/admin accept requested booking
- partner/admin reject requested booking and queue an eligible refund record
- customer/partner/admin cancel cancellable booking using the locked cancellation slabs
- creates booking-scoped chat thread on acceptance
- creates durable notifications
- writes audit records

Actual payment-provider refunds are intentionally not claimed or executed because no gateway/provider integration has been configured yet.

## Not yet production-live
The following require provider credentials or additional implementation/testing and therefore are not represented as completed:
- real payment gateway order/payment/webhook integration
- real provider refund execution
- automated 2-hour expiry worker
- automated 6–8 hour payout processor
- payout provider integration
- KYC/background-check provider integration
- SMS/OTP provider
- email delivery provider
- full notification delivery worker
- complete chat attachment storage path
- complete dispute evidence workflow
- end-to-end customer/partner/admin test suite

## Git synchronization
The Supabase migration is checked in under `supabase/migrations/20260917_backend_core_entities_and_security.sql`.
The deployed booking action function is checked in under `supabase/functions/booking-actions/index.ts`.
