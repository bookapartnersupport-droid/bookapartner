# BOOK A PARTNER — MASTER HANDOFF

## Purpose
This document is the single source of truth for continuing the Book A Partner build across ChatGPT/Codex/Supabase sessions. Read this before making backend or frontend changes.

## Product
Brand: Book A Partner
Positioning: verified companion/service marketplace focused on safe, professional, transparent and affordable services.
Initial market: Gurugram/Gurgaon NCR, India.
Frontend deployment: GitHub Pages at `https://bookapartnersupport-droid.github.io/bookapartner/`.
GitHub repo: `bookapartnersupport-droid/bookapartner`.
Supabase project: `book-a-partner`, project ref `wmawmdwjibvlqsugthhe`, region `ap-south-1`, PostgreSQL 17, organization `Book A Partner`, Pro plan.

## Working principles
1. Do not create a replacement Supabase project. Use the existing `book-a-partner` project.
2. Inspect live schema, migrations, RLS, storage, Auth and Edge Functions before changing anything.
3. Do not invent column names, tables, relationships, statuses or policies when the live schema can be inspected.
4. Preserve existing working data and previously applied security changes.
5. Prefer migrations for DDL and keep backend changes reproducible.
6. Never put service-role keys, payment secrets, Twilio/OTP secrets or other sensitive credentials in static frontend code.
7. Use Edge Functions/server-side code for privileged operations, payment gateway operations, webhooks, payout operations and secret-bearing integrations.
8. RLS must remain enabled and must enforce customer/partner/admin boundaries at database level, not only by frontend redirects.
9. Protected routes must validate the authenticated session/token and role; never trust only localStorage or a client-side role flag.
10. Keep GitHub synchronized with frontend/backend configuration and migration documentation. Save major implementation decisions in this repository.
11. Do not call the product production-live until end-to-end tests actually pass.
12. Work in batches when the required intent is clear. Do not repeatedly ask the owner to manually patch code.

## Current confirmed Supabase resources
Known tables before the latest security work: `user_profiles`, `partner_applications`, `partners`, `bookings`, `disputes`. There may now be additional security/support objects; inspect live database before assuming this list is complete.
Known private storage buckets: `partner-photos`, `partner-selfies`, `partner-proofs`.
Auth: email/password enabled for MVP; email confirmation was disabled for MVP; phone provider/Twilio OTP was not enabled for MVP. Mobile OTP is planned later, with India-focused provider evaluation such as MSG91 when appropriate.

## Security work already reported by an authorized Supabase session
A separate authorized session reported that it:
- verified the existing `book-a-partner` project;
- verified PostgreSQL 17 and `ap-south-1`;
- verified `user_profiles` roles `customer`, `partner`, `admin`;
- verified RLS on main public tables;
- tightened anonymous execution of sensitive `SECURITY DEFINER` RPCs;
- adjusted public/authenticated RPC access for `rls_auto_enable()`;
- checked Supabase security advisories.
Do not repeat or undo these changes blindly. Inspect actual migrations, grants and policies first.

## Existing frontend/GitHub state
Main app files include:
- `index.html`
- `bap-multipartner.js`
- `bap-categories.js`
- `logo.png`
The intended full `bap-multipartner.js` is approximately 5,373 lines / 95,539 bytes and contains the real Supabase partner-application backend block. It loads `@supabase/supabase-js@2` from jsDelivr and contains partner signup, profile upsert, storage uploads and `partner_applications` insert logic. The public publishable Supabase key is used in frontend code; no service-role key belongs there.
`bap-categories.js` centralizes categories, rates, specialized requirements, gender options and dynamic service dropdowns.
Google Maps browser API key exists in frontend and must be restricted by HTTP referrers/APIs before production.

## Admin modules already created in GitHub
The repo contains standalone admin modules including:
- `admin.html`
- `admin-operations.html`
- `admin-bookings.html`
- `admin-customer-management.html`
- `admin-partner-disciplinary.html`
- `admin-customer-disciplinary.html`
- `admin-safety-center.html`
- `admin-safety-disciplinary.html`
- `admin-disputes.html`
- `admin-payout-center.html`
- `admin-payment-center.html`
- `admin-refund-center.html`
- `admin-reconciliation-center.html`
- `admin-audit-logs.html`
- `admin-critical-actions.html`
- `admin-user-management.html`
Admin modules are operational foundations but several use flexible field aliases or session-only UI because the final live schema was not yet fully audited. Do not assume every admin action is production-backed.

## Legal/policy pages already created
- `terms.html`
- `privacy.html`
- `refund-policy.html`
- `partner-agreement.html`
- `policies.html`
These are MVP policy drafts and require India-qualified legal review before production. `admin-operations.html` links to the public legal/policies center.

## Customer requirements F1–F20
F1. Customer must be 18+.
F2. Signup: Name, Email, Mobile, Password, DOB/Age, City/Area, Profile Photo, Terms acceptance.
F3. MVP email verification first; mobile OTP later.
F4. Search filters: Service, Area/Location, Date, Time, Price range, Rating, Availability. Only Approved/Live partners.
F5. Partner direct contact info hidden before booking; communication stays in platform.
F6. Booking minimum 1 hour; duration 1,2,3,4+ hours. Date + Start Time + Duration. Request -> partner accept/reject. Accept -> confirmed. Full payment at request. Partner rejection -> full refund.
F7. Customer cancellation before partner acceptance -> full refund.
F8. After partner acceptance cancellation: 24+ hrs 100%; 12–24 hrs 75%; 6–12 hrs 50%; under 6 hrs 0%.
F9. Partner cancellation -> full refund, record, warning/suspension for repetition, emergency review, alternative partner where appropriate.
F10. Partner no-show -> full refund, report/evidence, violation handling, repeated suspension/ban, admin review of extra costs.
F11. Customer no-show -> no refund; partner payout eligible subject to evidence/admin rules.
F12. Late arrival: 15-minute grace. Beyond 15 minutes can be reported; significant delay can allow cancellation/refund subject to review; actual time can be adjusted by admin.
F13. Prefer public/safe locations. Home/service address allowed for Medical, Elder Care, Daily Assistance, Technical Assistance etc. Specialized services require qualification/proof.
F14. Home address private; only confirmed/assigned partner plus authorized admin may access it.
F15. Confirmed booking cannot be directly edited; use Request Change -> partner approval.
F16. Extend Booking -> partner accepts -> extra payment -> confirmed.
F17. Early completion: mutual no automatic refund; partner ends early -> Report Issue and actual-time/admin review.
F18. Completion: scheduled end -> verification -> customer Meeting OK -> Completed; issue -> dispute. One-hour confirmation window; no action auto-completes and payout becomes eligible unless dispute.
F19. Ratings: 1–5 both directions, optional review, completed bookings only, one review per booking, public approved reviews with moderation.
F20. Customer safety: SOS/Report Issue/Block Partner; Help & Safety categories; notifications; dashboard; account controls including deletion checks.

## Partner requirements P1–P20
P1. Registration fields mirror customer plus service/rate/profile/verification information required by onboarding.
P2. Verification lifecycle: Basic Registration -> KYC -> Police/Background -> Call -> Admin -> Approved/Rejected -> Live. Public badge only; never expose report details. Verification record should retain status/date/reference/authority/provider/validity/recheck/admin notes as private/admin data. Due diligence is not a guarantee.
P3. KYC mandatory; private/admin. Public badge allowed. Payout KYC match where feasible.
P4. Maximum 5 services initially. Specialized service requires proof.
P5. Pricing: 1h base. 2h 5% discount; 3h 10%; 4h 15%; 5+h 20% maximum mandatory discount. Transport: 10 km free, then maximum ₹150. Partner sees earnings before accept.
P6. Availability slots; confirmed bookings block conflicting availability; future slots editable.
P7. Partner sees request details and financials.
P8. Partner cancellation follows policy and disciplinary rules.
P9. Partner no-show follows policy and evidence/admin rules.
P10. Late arrival follows 15-minute grace and reporting rules.
P11. Early departure follows issue/admin review rules.
P12. Platform commission 15%; example ₹1000 gross -> ₹150 commission -> ₹850 partner net. Future fee changes require notice.
P13. Payout normally targeted 6–8 hours after completion, subject to processing/no dispute.
P14. Payout to verified bank/UPI, KYC match where feasible, dashboard status, no minimum.
P15. Ratings follow mutual completed-booking rules.
P16. Partner safety: SOS, Report Customer, Block Customer, 112/appropriate emergency services.
P17. Partner dashboard includes requests, bookings, earnings/payout, availability, messages, reviews, profile and safety.
P18. Status lifecycle Live -> Warning -> Suspended -> Deactivated/Banned, with reasons/evidence and appeal/review.
P19. Partner Agreement mandatory before Live.
P20. Exit/deletion only after pending bookings/disputes/payouts are resolved; retention obligations apply; fresh verification may be required for reactivation.

## Booking/payment/refund/finance requirements B1–B20
B1. Full payment at booking request; partner accepts or rejects.
B2. Price = Base x Duration - duration discount + transport. Commission is calculated from applicable retained revenue.
B3. Partner response window is 2 hours. No response -> auto-expire and full refund.
B4. Refund initiation target max 1 hour after eligible decision; provider settlement timing can differ.
B5. Eligible full refund returns full customer-paid amount including commission; platform/partner receive zero retained revenue.
B6. Partial refund slabs: 24+ hrs 100%; 12–24 75%; 6–12 50%; <6 0% for customer cancellation after acceptance.
B7. Gateway fee is not deducted from eligible full refunds under the locked policy.
B8. Active dispute holds partner payout.
B9. Evidence rules apply to no-show, safety and disputes; protect evidence privacy.
B10. Normal dispute target 24 hours, not guaranteed.
B11. Admin makes final settlement subject to appeal/legal rules.
B12. Appeal window 48 hours.
B13. Normal completion -> payout eligible after confirmation window if no dispute.
B14. Payout status tracking required.
B15. Payout failure requires retry/manual review flow.
B16. Payout account changes require verification and safeguards.
B17. Commission applies to retained revenue only.
B18. Financial ledger required for payment, refund, commission, payout and adjustments.
B19. Gateway mismatch/payment review -> hold before fulfillment/payout.
B20. Audit trail required for critical financial/admin actions.

## Safety and trust requirements C1–C20
C1 identity authenticity; C2 communication/privacy; C3 zero-tolerance harassment; C4 prohibited illegal activities; C5 safe meeting locations; C6 SOS; C7 emergency payout hold; C8 block; C9 suspicious accounts; C10 evidence privacy; C11 data minimization/role access; C12 account security; C13 18+ only; C14 safe service boundaries; C15 off-platform payment prohibition; C16 unauthorized recording prohibited/discouraged; C17 alcohol/intoxication safety; C18 unsafe transport/driving restrictions; C19 mutual respect; C20 safety escalation.

## Communication/notification requirements D1–D20
D1 in-app chat. D2 chat availability depends on booking state. D3 notifications. D4 notification preferences. D5 reminders. D6 booking status. D7 change notifications. D8 payment/refund notifications. D9 reviews. D10 support/complaint notifications. D11 email/account notifications. D12 delivery failure fallback. D13 Notification Center. D14 deep links/actions. D15 chat message statuses. D16 attachments. D17 anti-spam. D18 time sensitivity. D19 priority. D20 communication audit.

## Admin requirements E1–E20
E1 admin roles/access. E2 dashboard metrics. E3 partner applications/statuses. E4 verification center. E5 approve/reject. E6 partner management. E7 customer management. E8 booking management. E9 complaints/safety. E10 disputes. E11 payout center. E12 payment center. E13 refund center. E14 reconciliation. E15 audit logs. E16 admin user management. E17 safety center. E18 partner disciplinary. E19 customer disciplinary. E20 critical actions/security controls.

## Legal/policy requirements F1–F20
F1 Terms. F2 Privacy. F3 Refund/Cancellation. F4 Partner Agreement. F5 liability/service disclaimer. F6 Indian law/jurisdiction. F7 user rights/deletion. F8 consent/versioning. F9 third parties. F10 IP. F11 UGC/reviews. F12 prohibited content/moderation. F13 suspension/termination. F14 legal notices/responsibilities. F15 fees/taxes. F16 force majeure. F17 grievance mechanism. F18 data retention. F19 authority cooperation. F20 final policy version/effective date/legal review.

## UX/screen requirements G1–G18
G1 Entry/role selection: Welcome, Find Partner, Become Partner, Login; separate customer/partner onboarding/login; admin separate; 18+ and terms/privacy.
G2 Customer Home: logo/location/notifications/profile; service cards; search; upcoming; recommended/recent; Help & Safety; bottom nav; active-booking SOS; only Approved/Live partners.
G3 Search: filters and cards; no contact; hidden blocked/suspended partners.
G4 Partner profile: public-safe fields only; no contact/KYC/private address/police details/admin notes; availability/book/report/block.
G5 Booking selection: service/date/time/duration/location/note; price formula; transport; availability; minimum 1h; refund policy.
G6 Review booking: financials, cancellation, 2h response, terms.
G7 Secure payment gateway; never collect/store card/CVV/UPI PIN in app frontend.
G8 Request confirmation: payment reference + waiting for partner; payment is not confirmation.
G9 Partner accept/reject: financials, commission, warning, reason, 2h deadline.
G10 Confirmed booking: chat/request change/cancel/report/SOS.
G11 Upcoming booking/reminders.
G12 Active booking: status controls, chat, arrived/late, SOS/report/block, grace period.
G13 Completion/confirmation window.
G14 History.
G15 Messages/chat.
G16 Reviews.
G17 Profile/settings.
G18 Help & Safety: Emergency SOS/Call 112; Report User; Block User; Unsafe Location; Harassment/Threat; No-show; Late Arrival; Fraud/Suspicious Activity; support categories Booking, Payment, Refund, Partner/Customer, Technical, Account, Other; complaint ID/status; payout held while active; serious matters can escalate to authorities; platform is not an emergency response provider.

## Safety/complaint model
A complaint/case should contain or reference Booking ID, customer, partner, category, timestamp, description, evidence and status where schema permits. Status lifecycle: Open -> Under Review -> Resolved/Rejected/Escalated. Serious cases can trigger safety action and payout hold. Block restricts future interaction/booking; existing confirmed bookings require review rather than blind auto-cancel. SOS should confirm emergency intent, provide option to call 112/appropriate emergency service, flag current booking, alert authorized safety/admin staff where available, and log timestamp. Do not encourage secret/unauthorized recording.

## Partner application lifecycle
Public application -> Auth user -> `user_profiles` role=partner -> private storage uploads -> `partner_applications` -> call pending -> KYC/background verification -> admin review -> approved/rejected -> partner live after Partner Agreement. Public profile must not expose private KYC/evidence/admin notes.

## Customer/partner Auth model
Use Supabase Auth as identity source. `user_profiles` is application profile/role source. Role must be enforced through database RLS and/or secure server-side verification, not only frontend localStorage. Customer/partner/admin route protection must validate session and role.

## Payment architecture target
Do not implement real payment processing by putting secrets in `index.html`. Use a supported payment provider via secure Edge Functions. Flow target: create payment/order -> customer pays -> webhook verifies gateway event -> booking payment marked captured/authorized according to gateway -> partner request is activated -> acceptance confirms booking -> refund/reversal path on rejection/expiry/cancellation -> ledger entries for every money movement -> payout only when eligible and no active dispute. Never trust a client-submitted payment-success flag.

## Payout architecture target
Partner payout is not a frontend button that moves money. Maintain ledger and payout eligibility state server-side. Target status: Not Eligible -> Eligible -> Processing -> Paid / Failed / On Hold. On Hold if dispute, safety case, payment mismatch or admin review. Commission 15% of retained revenue. Target release 6–8 hours after completion when no dispute, subject to gateway/provider processing.

## Refund architecture target
Refund policy is deterministic from booking state, actor, acceptance state and timing. Compute server-side; customer UI may preview only. Execute refunds only through secure provider integration after verified payment state. Store refund request/result/reference/timestamps in a financial ledger/refund record when schema is finalized. Do not claim a refund succeeded merely because UI says so.

## Booking state machine target
At minimum consider: request/pending partner response -> accepted/confirmed -> active -> completion confirmation window -> completed. Alternative states: rejected, expired, cancelled_by_customer, cancelled_by_partner, no_show_customer, no_show_partner, issue/dispute, refunded. Exact enum/string values must follow live schema after audit.

## Change/extension target
Confirmed booking changes require partner approval. Extensions require partner acceptance and additional verified payment before extending the confirmed booking. Never allow client-only duration/amount mutation after payment.

## Chat target
In-app booking-scoped chat. Access only to authorized customer/partner participants and admin/safety roles where appropriate. Store sender, booking reference, message, timestamp, delivery/read status and permitted attachments. Never expose direct contact information merely because chat exists.

## Notifications target
Notification center plus relevant email/in-app notifications for signup, verification, booking submitted, accept/reject, payment, confirmed, cancellation/refund, reminders, arrival, completion, review, complaint/dispute, refund and payout status. Use durable notification records so delivery status can be audited. Avoid sensitive content in notification previews.

## Reviews target
Only completed bookings. One review per direction per booking. 1–5 rating, optional text. Moderation and public-safe publication. Block/restrict abusive content. Do not allow reviews to be tied to unverified external bookings.

## Account deletion target
Before deletion: block/deny if active confirmed booking, open dispute, pending payout/refund or legally required retention. Anonymize/deactivate where full hard delete conflicts with retention requirements. Remove private profile/storage data when permitted. Revoke active sessions and ensure role access is removed.

## RLS/security target
Audit every table for SELECT/INSERT/UPDATE/DELETE policies by role. Customer sees own profile/bookings/payments/complaints. Partner sees own profile/application, assigned requests/bookings and own financial/payout information. Admin sees authorized operational data. Private storage must not become public. Home/service addresses and KYC/evidence must be role-restricted. SECURITY DEFINER functions must have safe `search_path`, explicit grants and authorization checks. Never grant sensitive RPC execution to `anon`.

## Storage target
Existing private buckets: `partner-photos`, `partner-selfies`, `partner-proofs`. Enforce authenticated ownership/admin access and file-type/size controls. Do not make KYC/proof buckets public. Use signed URLs or authorized retrieval when needed.

## Background jobs / automation target
Use scheduled/server-side jobs where available for: partner response expiry after 2h; completion auto-confirmation after 1h window; reminders; notification retries; payout eligibility; stale payment review; refund retry; verification recheck reminders. Keep jobs idempotent and auditable.

## Audit/logging target
Critical events: signup, role assignment, application submission, verification changes, approval/rejection, partner status changes, booking state changes, payment events, refund decisions/execution, commission, payout state, disputes, complaints, SOS, block/unblock, admin critical actions, account deletion. Log actor, action, object, timestamp and relevant before/after metadata without storing secrets.

## Production security checklist
- RLS on every user-data table.
- No service-role key in frontend.
- No payment secrets in frontend.
- Secure webhook signature verification.
- Authenticated Edge Functions for normal operations; webhook functions may use provider signature verification where JWT cannot be used.
- Server-side authorization on every privileged operation.
- Rate limits/anti-spam for auth, chat, complaints and sensitive actions.
- Restrict Google Maps key by referrer and API.
- Private storage for KYC/evidence.
- Minimize PII returned to browser.
- Secure error messages; do not leak SQL/schema/secrets.
- Reconciliation checks for gateway vs internal ledger.
- Back up/export migration history before major destructive changes.

## Current blocker history
The project originally had an API DNS problem: `ERR_NAME_NOT_RESOLVED` / `DNS_PROBE_FINISHED_NXDOMAIN` for `https://wmawmdwjibvlqsugthhe.supabase.co/auth/v1/signup`, causing `AuthRetryableFetchError: Failed to fetch`. Support ticket `SU-473711` was submitted. The project was later upgraded to Pro and the Supabase management connection became available. Do not assume the original DNS problem remains; test the live API before changing infrastructure.

## GitHub/source-of-truth backup
`BACKEND_BUILD_HANDOFF.md` also exists as a shorter backend roadmap. This document is the more complete master handoff. Keep both updated if major architecture changes occur.

## How the next authorized agent should work
1. Confirm the project ref and active status.
2. Inspect live tables with columns, keys and relationships.
3. Inspect migrations and existing security/RLS policies.
4. Inspect storage buckets and policies.
5. Inspect Auth configuration relevant to the MVP.
6. Inspect existing Edge Functions and advisories.
7. Compare the live schema against this handoff and the GitHub frontend/admin code.
8. Create only the missing backend pieces, preferably through migrations and secure Edge Functions.
9. Test every changed path with realistic role boundaries.
10. Update GitHub with migrations/functions/config documentation and any frontend integration needed.
11. Run security/performance advisors again.
12. Report exactly what was changed, what was tested, and what remains blocked by external providers (payment gateway, SMS/OTP, legal review, etc.).

## Important: do not overclaim
The presence of admin HTML pages, localStorage prototype flows or UI buttons does not mean the underlying backend action is production-ready. The authoritative test is the live Supabase database/RLS/Edge Function/payment webhook behavior plus end-to-end frontend testing.
