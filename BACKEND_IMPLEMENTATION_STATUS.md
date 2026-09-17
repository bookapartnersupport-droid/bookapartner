# Book A Partner — Backend Implementation Status

Updated: 2026-09-17

## Source of truth
`BOOK_A_PARTNER_MASTER_HANDOFF.md` remains the canonical product/backend specification.

## Live Supabase audit
Project: `book-a-partner`
Ref: `wmawmdwjjbvlqsugthhe`
Region: `ap-south-1`
PostgreSQL: 17.6

Confirmed live entities include the original core tables plus:
`audit_logs`, `notifications`, `chat_threads`, `chat_messages`, `reviews`, `complaints`, `financial_ledger`, `refunds`, `payout_accounts`, `payouts`, `booking_change_requests`, `booking_extensions`, `blocked_users`, `account_deletion_requests`.

Private storage buckets remain in place and RLS remains enabled. Financial ledger, refund, payout and audit writes are backend-controlled rather than exposed as direct authenticated-client writes.

## Hardening applied live
- Booking lifecycle timestamps and duration support added.
- Database-side cancellation/refund percentage helper added.
- Direct booking state tampering is guarded by a database trigger; privileged state transitions go through backend actions.
- Partner verification fields are protected from applicant-side edits.
- Payout-account verification/processor fields are protected from client edits.
- Reviews require an authenticated booking participant and a completed booking; self-review is blocked.
- Complaint/dispute triggers place associated payout on hold.
- Dispute status supports appeal/escalation states.
- Refund percentage is stored with refund records.
- 2-hour partner response expiry is now scheduled through Supabase Cron.
- Completion auto-finalization and payout-eligibility checks are scheduled through Supabase Cron.
- Payout calculation uses the locked 15% commission rule and a 6-hour minimum eligibility delay; actual money movement is still provider-dependent.

## Edge Function
`booking-actions` is ACTIVE, JWT protected, and deployed at version 2.

Current server actions include:
- partner/admin accept → confirmed
- partner/admin reject → full refund queue
- customer/partner/admin cancellation with locked refund slabs
- partner arrival / late-arrival reporting
- no-show reporting with complaint/payout hold linkage
- booking change request + response
- booking extension request + partner response, with payment-required boundary
- customer Meeting OK / completion handling
- partner/admin completion
- issue/complaint reporting
- user blocking
- admin refund state finalization
- booking-scoped chat thread creation
- durable notifications and audit records

## Scheduled backend jobs
- `bap-expire-bookings` — every minute
- `bap-finalize-due-bookings` — every 5 minutes
- `bap-release-due-payouts` — every 5 minutes

## Intentionally not production-live yet
These require external provider credentials, configuration, or dedicated E2E testing:
- payment gateway + webhook
- actual provider refund execution
- actual payout processor/bank/UPI settlement
- KYC/background-check provider
- SMS/OTP
- transactional email delivery
- complete notification delivery worker
- chat attachment storage/virus scanning workflow
- full dispute evidence workflow
- full E2E customer/partner/admin test suite

## Git synchronization
Backend migration and Edge Function source are checked into GitHub under `supabase/migrations/` and `supabase/functions/booking-actions/index.ts`.

Important: the backend core is substantially hardened, but the project is not being labeled fully production-live until payment/payout/provider integrations and full E2E verification are completed.
