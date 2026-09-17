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
`audit_logs`, `notifications`, `chat_threads`, `chat_messages`, `reviews`, `complaints`, `financial_ledger`, `refunds`, `payout_accounts`, `payouts`, `booking_change_requests`, `booking_extensions`, `blocked_users`, `account_deletion_requests`, `action_idempotency`, `payment_transactions`, `payment_webhook_events`.

Private storage buckets remain in place and RLS remains enabled. A private `chat-attachments` bucket is now provisioned with participant/admin read and owner/admin delete controls. Financial ledger, refund, payout, idempotency, payment-transaction and webhook-event writes are backend-controlled rather than exposed as direct authenticated-client writes.

## Hardening applied live
- Booking lifecycle timestamps and duration support added.
- Database-side cancellation/refund percentage helper added with fixed search_path.
- Direct booking state tampering is guarded by a database trigger; privileged state transitions go through backend actions.
- Partner verification fields are protected from applicant-side edits.
- Payout-account verification/processor fields are protected from client edits.
- Reviews require an authenticated booking participant and a completed booking; self-review is blocked.
- Partner rating/review count are refreshed from approved reviews by a backend trigger.
- Complaint/dispute triggers place associated payout on hold.
- Dispute status supports appeal/escalation states.
- Refund percentage is stored with refund records and booking/reason uniqueness is enforced for safe queueing.
- 2-hour partner response expiry is scheduled through Supabase Cron.
- Completion auto-finalization and payout-eligibility checks are scheduled through Supabase Cron.
- Payout calculation uses the locked 15% commission rule and a 6-hour minimum eligibility delay; actual money movement is still provider-dependent.
- Backend foreign-key indexes were added for operational tables/relationships.
- Realtime publication now includes chat messages, notifications, change requests and extensions.
- Internal payment transaction and webhook-event ledgers are prepared without pretending an external gateway is configured.

## Edge Functions
`booking-actions` is ACTIVE, JWT protected, and deployed at version 2.

A new `booking-create` Edge Function is ACTIVE and JWT protected. It is the frontend booking-request boundary and performs:
- authenticated customer validation
- approved/live partner validation
- official partner-rate validation
- 1–24 hour duration validation
- locked duration discount calculation: 0%, 5%, 10%, 15%, then 20% max
- total calculation with transport cap
- 2-hour partner response deadline
- idempotency protection through `action_idempotency`
- booking creation as `requested`
- demo payment transaction recorded as `captured` and booking payment held
- financial ledger entry
- customer + partner notifications
- booking audit entry

`booking-actions` current server actions include:
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
- account deletion request/blocker detection
- admin refund state finalization
- booking-scoped chat thread creation
- durable notifications and audit records

## Frontend live integration
The existing `index.html` now loads `bap-live-backend.js` after the existing demo scripts so the live adapter is the final handler.

The live adapter now connects the existing UI to Supabase for:
- email/password customer and partner login/signup while retaining the existing UI shell
- authenticated customer profile creation
- approved/live partner search from `partners`
- duration selector and locked duration-discount pricing
- live partner selection and booking review
- booking request creation through `booking-create`
- customer live booking list
- partner live booking request list
- partner accept/reject
- customer/partner cancellation through `booking-actions`
- partner arrival
- customer Meeting OK
- booking issue/complaint reporting
- booking-scoped chat read/send
- live booking/chat refresh through Supabase Realtime

The old demo/localStorage UI remains in place as a compatibility layer, but the live adapter is loaded last and overrides the booking/login actions used by the live flow.

## Scheduled backend jobs
- `bap-expire-bookings` — every minute — verified running successfully
- `bap-finalize-due-bookings` — every 5 minutes — verified running successfully
- `bap-release-due-payouts` — every 5 minutes — verified running successfully

## Verification result
- All current backend migrations applied successfully.
- `booking-actions` deployment verified ACTIVE at version 2.
- `booking-create` deployment verified ACTIVE at version 1.
- GitHub Actions injection job completed successfully and the live adapter is now last in `index.html`.
- Cron jobs are active and recent executions returned `succeeded`.
- Security advisor no longer reports the mutable search_path warning for the new refund helper.
- One remaining security warning is the existing `public.is_admin()` SECURITY DEFINER function being executable by authenticated users; it is retained because existing RLS policies depend on it.
- Performance advisor still reports RLS init-plan and multiple-permissive-policy optimization opportunities; these are performance tuning items, not a failed security deployment.

## Intentionally not production-live yet
These require external provider credentials, configuration, or dedicated E2E testing:
- payment gateway + webhook signing/provider integration
- actual provider refund execution
- actual payout processor/bank/UPI settlement
- KYC/background-check provider
- SMS/OTP
- transactional email delivery
- complete notification delivery worker
- chat attachment virus scanning/moderation workflow
- full dispute evidence workflow
- full E2E customer/partner/admin test suite

## Git synchronization
Backend migrations are checked into `supabase/migrations/`. The deployed booking action source is checked into `supabase/functions/booking-actions/index.ts`. The live frontend adapter is `bap-live-backend.js`. The booking creation Edge Function is deployed directly in Supabase. Status documentation is kept in this file.

Important: the backend core and the customer/partner booking lifecycle frontend are now substantially integrated, but the project is not being labeled fully production-live until payment/payout/provider integrations and full E2E verification are completed.
