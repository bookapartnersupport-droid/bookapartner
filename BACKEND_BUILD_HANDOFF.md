# Book A Partner — Backend Build Handoff

## Purpose
This file preserves the agreed implementation state and the next backend work so the project can resume without losing context.

## Current source of truth
- Frontend/app code: `index.html`, `bap-multipartner.js`, `bap-categories.js`
- Admin operations: `admin.html`, `admin-operations.html` and E1–E20 modules
- Public policy drafts: `terms.html`, `privacy.html`, `refund-policy.html`, `partner-agreement.html`
- Backend platform: Supabase project `book-a-partner`
- GitHub repo: `bookapartnersupport-droid/bookapartner`

## Confirmed Supabase schema before backend connection
Existing confirmed tables:
- `user_profiles`
- `partner_applications`
- `partners`
- `bookings`
- `disputes`

Existing private storage buckets:
- `partner-photos`
- `partner-selfies`
- `partner-proofs`

Do not invent database columns/tables during implementation. Inspect the live schema first and use migrations for approved additions.

## Agreed production backend work
1. Audit current Supabase schema, Auth, Storage and RLS.
2. Create/extend migrations for missing production entities and relationships required by the finalized rules.
3. Customer authentication/profile lifecycle.
4. Partner application → KYC/proof → call/admin review → Live lifecycle.
5. Booking request, partner accept/reject, 2-hour expiry and confirmation.
6. Booking cancellation/no-show/late/early-completion logic.
7. Payment gateway integration through secure server-side/Edge Function code; never expose secret keys in frontend.
8. Payment webhooks and transaction ledger/reconciliation.
9. Refund calculation and secure refund processing.
10. Partner commission and payout eligibility/holds/release workflow.
11. Disputes/complaints, evidence storage, safety escalation and payout holds.
12. Persistent audit logs for sensitive admin actions.
13. Realtime booking chat and message permissions.
14. Notification records and delivery workflow.
15. Reviews/ratings with completed-booking-only rules and moderation support.
16. Account deletion workflow with active booking/dispute/payout/retention checks.
17. Admin role/RLS hardening and least-privilege access.
18. Production security review, error handling and reconciliation.
19. Connect frontend to the real backend and remove prototype-only paths where their production replacements are ready.
20. End-to-end testing of customer, partner and admin flows before launch.

## Fixed business rules to preserve
- Customer and partner must be 18+.
- Booking minimum: 1 hour.
- Partner response window: 2 hours; no response may auto-expire with full refund.
- Customer cancellation after acceptance: 24h+ = 100%; 12–24h = 75%; 6–12h = 50%; under 6h = 0%.
- Partner cancellation/no-show: full customer refund, with operational/disciplined review.
- Customer no-show: normally no refund; partner payout subject to evidence/admin review.
- Arrival grace period: 15 minutes.
- Partner commission: 15% of eligible retained revenue.
- Normal payout target: 6–8 hours after completion, subject to processing and no active hold/dispute.
- Full eligible refund should not deduct gateway fee under the agreed policy, subject to provider capability/law.
- Home/private address is not public; disclose only at the appropriate confirmed-booking stage.
- Off-platform payment is prohibited.
- SOS must provide access to 112/appropriate emergency services; platform is not an emergency-response provider.
- Active disputes can hold partner payout.
- Ratings/reviews only after completed bookings, one review per booking per direction, subject to moderation.

## Known blocker
Supabase project API hostname previously returned `ERR_NAME_NOT_RESOLVED` / `DNS_PROBE_FINISHED_NXDOMAIN`, causing partner signup `Failed to fetch`. Support ticket: `SU-473711`. Re-test the project API after the DNS issue is resolved.

## Billing/connection plan
User intends to arrange a payment card and upgrade the existing Supabase organization/project to Pro. Do not create a replacement Supabase project unless explicitly required.

After the user connects/authorizes the Supabase integration, resume by auditing the existing project first, then implement the backend in the project above and synchronize frontend code with the live schema.

## Safety / security rules
- Never store or expose payment card numbers, CVV or UPI PIN.
- Never put Supabase service-role keys, payment gateway secrets, webhook secrets or messaging-provider secrets in static frontend code.
- Use Edge Functions/server-side secrets for privileged operations.
- Preserve RLS and test access by role.
- Do not claim a feature is production-live until its backend path is actually connected and tested.

## Legal status
The policy pages are MVP drafts. Before production launch, obtain India-qualified legal review and fill final business/legal contact, effective date and jurisdiction details.
