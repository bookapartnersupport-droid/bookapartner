# Book A Partner — Backend Implementation Status

Updated: 2026-09-18

## Source of truth
`BOOK_A_PARTNER_MASTER_HANDOFF.md` remains the canonical product/backend specification.

## Live Supabase audit
Project: `book-a-partner`
Ref: `wmawmdwjjbvlqsugthhe`
Region: `ap-south-1`
PostgreSQL: 17.6

Confirmed live entities include the original core tables plus:
`audit_logs`, `notifications`, `chat_threads`, `chat_messages`, `reviews`, `complaints`, `financial_ledger`, `refunds`, `payout_accounts`, `payouts`, `booking_change_requests`, `booking_extensions`, `blocked_users`, `account_deletion_requests`, `action_idempotency`, `payment_transactions`, `payment_webhook_events`.

Private storage buckets remain in place and RLS remains enabled. A private `chat-attachments` bucket is provisioned with participant/admin access controls. Financial ledger, refund, payout, idempotency, payment-transaction and webhook-event writes are backend-controlled.

## Hardening applied live
- Booking lifecycle timestamps and duration support.
- Database-side cancellation/refund percentage helper.
- Direct booking state tampering guard.
- Partner verification and payout-account protected fields.
- Review participant/completion/self-review controls.
- Partner rating/review-count refresh trigger.
- Complaint/dispute payout holds.
- Refund uniqueness/idempotency safeguards.
- 2-hour response expiry, completion finalization and payout-eligibility cron jobs.
- 15% commission and 6-hour payout eligibility rule.
- Foreign-key indexes and Realtime publication for communication/booking-support tables.
- Booking overlap helper checks the full requested duration against existing requested/accepted/confirmed bookings.
- Booking insert validation enforces 1–24 hour duration and a minimum 5-minute future booking time.
- `booking-actions Edge Function: ACTIVE v4 — participant response-direction hardening for change/extension requests.now creates a durable complaint when late arrival is reported.
- Account deletion blocker lookup now uses a direct partner-id lookup instead of unsupported nested PostgREST syntax.
- Customer Meeting OK completion now safely handles both confirmed and accepted booking states.

## Edge Functions
`booking-actions` is ACTIVE, JWT protected, version 3.

`booking-create` is ACTIVE, JWT protected, and is the frontend booking-request boundary. It validates customer role, partner status/service/rate, duration, datetime, pricing, idempotency, creates the requested booking, records the demo payment/ledger entry, and creates notifications/audit records.

## Frontend live integration
The existing `index.html` loads `bap-live-backend.js` after the existing demo scripts so the live adapter is the final handler.

The live adapter connects the existing UI to Supabase for customer/partner authentication, profile creation, approved/live partner search, duration pricing, partner selection, booking creation, booking lists, partner accept/reject, cancellation, arrival, Meeting OK, issue/complaint reporting, booking-scoped chat, and Realtime refresh.

The existing demo/localStorage layer remains as a compatibility layer; the live adapter is loaded last.

## Scheduled backend jobs
- `bap-expire-bookings` — every minute
- `bap-finalize-due-bookings` — every 5 minutes
- `bap-release-due-payouts` — every 5 minutes

## Remaining non-payment work
- KYC/background-check provider integration
- SMS/mobile OTP
- transactional email delivery/fallback
- complete notification delivery worker
- chat attachment scanning/moderation
- full dispute evidence workflow
- full customer/partner/admin E2E test suite
- final RLS performance/security review
- final India-qualified legal review of policies

## Payment-dependent work intentionally deferred
- real payment gateway + signed webhooks
- provider refund execution
- real partner bank/UPI payout settlement

Important: the project is not being labeled fully production-live until provider integrations and full E2E verification are completed.


## 2026-09-21 Frontend lifecycle batch
- booking-actions upgraded to ACTIVE v4.
- Change requests can now be answered by the other booking participant (customer or partner); requester cannot self-approve.
- Extension requests can now be answered by the other participant; acceptance remains payment-gated.
- Customer/partner booking UI now exposes pending change/extension response actions.
- Live Notifications and My Complaints panels added to the customer booking area.
- No production business data was modified.
