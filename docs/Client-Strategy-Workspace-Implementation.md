# Client Strategy Workspace implementation

Status: Active  
Owner: Coach Kagiso dashboard  
Started: 19 July 2026  
Last updated: 21 July 2026

## Outcome

Turn Career Tools from a one-off CV analyzer into a client strategy workspace that can use the client's purchased service, CV, intake answers, and session debrief to draft a personalized support plan.

The system must reduce admin, preserve Kagiso's judgment, and keep every client-facing AI draft behind an approval step.

## Product position

This is an internal delivery workspace, not another public career assessment.

Its promise is:

> Bring the client's real context into one workspace, turn the session into a practical plan, then review every recommendation before it leaves the dashboard.

V1 plan generation is intentionally limited to:

- Career Clarity Session: personalized 14-day follow-up
- Glow Up VIP Package: personalized 30-day support plan

The Saturday Masterclass remains a cohort workflow. Async CV and LinkedIn services can gain reusable client profiles later, but they do not enter the 14-day or 30-day plan engine in V1.

## Current product reality

The buying flow already creates a deterministic payment reference for accepted Career Clarity and Glow Up bookings. Cal.com also sends a signed webhook containing booking details and responses.

The missing link is persistence. The current Cal.com webhook reads the attendee's name and email, sends the accepted-booking payment link, and logs the raw payload. It does not normalize the client's booking answers into `intake_submissions`. This means the dashboard claim that booking details are already connected to the appointment is only partially true.

The existing Clients dashboard also treats every booking service as if an intake exists, even when no normalized intake row is available. That hides the data gap.

## Target flow

1. Client requests Career Clarity or Glow Up through Cal.com.
2. The signed webhook identifies the service and booking.
3. The dashboard creates a replay-safe pending engagement record using the deterministic booking payment reference.
4. Cal.com answers and any CV link are normalized into a replay-safe intake record.
5. PayFast confirms the same engagement record.
6. The Clients dashboard shows the actual intake, not an assumed intake state.
7. Kagiso opens the client's strategy workspace and adds a short structured session debrief.
8. AI drafts the service-specific 14-day or 30-day plan from the CV, intake, and debrief.
9. Kagiso edits and approves the draft.
10. Kagiso confirms the recipient before the server sends the locked, approved version through Brevo.
11. Successful delivery creates the service-specific progress checkpoints.
12. Kagiso records outcomes beside the plan without changing the approved client-facing content.

## Data model direction

### V1 engagement identity

Use the existing deterministic `payment_id` as the engagement key for Career Clarity and Glow Up. This keeps Cal.com, PayFast, intake, delivery, and dashboard records aligned without a second manual identifier.

This is not the permanent person identity. A later profile slice should introduce a stable `client_id` so one person can have multiple purchases and sessions without being treated as multiple people.

### Intake provenance

`intake_submissions` needs explicit provenance:

- `source`: native form or Cal.com
- `source_reference`: the external source's stable reference, such as the Cal.com booking UID
- `source_metadata`: booking times, event slug, and webhook version without mixing technical metadata into visible intake answers

The pair `source` plus `source_reference` is unique when a reference exists. This makes webhook replays update the same intake instead of creating duplicates.

### Session debrief, planned slice

The debrief should be short but structured:

- What changed or became clearer
- Key blockers or risks
- Strengths and proof surfaced in the session
- Decisions made
- Client commitments
- Kagiso commitments
- Tone or sensitivity notes for the follow-up

### Generated plan, planned slice

Every generated plan must retain:

- source engagement and client references
- service-specific duration
- draft, approved, sent, and superseded status
- generated content and edited final content
- generator model and prompt version
- approver and approval timestamp

No AI-generated client plan can move directly from generation to sending.

## Implementation slices

### Slice 1: Persist Cal.com booking intake

Status: Implemented locally, database migration applied

- [x] Trace the real Cal.com, PayFast, Supabase, and Clients dashboard flow
- [x] Confirm the current Cal.com webhook response contract
- [x] Add normalization tests for current and legacy Cal.com response shapes
- [x] Add intake provenance migration
- [x] Create replay-safe pending engagement and intake records from eligible bookings
- [x] Show actual booking intake state in Clients
- [x] Run focused tests, typecheck, and lint on changed files

### Slice 2: Client strategy workspace shell

Status: Implemented locally, database migration applied

- [x] Add a stable workspace route from Career Tools and Clients
- [x] Auto-load engagement, intake, CV reference, and existing notes
- [x] Add structured session debrief editing
- [x] Add save and audit behavior

### Slice 3: Personalized plan drafting

Status: Implemented locally, database migration applied

- [x] Create separate Career Clarity and Glow Up plan schemas
- [x] Generate from source records without fabricated claims or statistics
- [x] Show source context beside the draft
- [x] Add edit, regenerate, approve, and version controls
- [x] Prevent unapproved sending or export

### Slice 4: Delivery and learning loop

Status: Implemented locally, database migration applied

- [x] Add approved-plan email delivery through Brevo
- [x] Add 14-day and 30-day progress checkpoints
- [x] Record follow-up outcomes without silently changing the approved plan
- [x] Add aggregate, privacy-safe theme reporting for future service validation

### Slice 5: Dashboard access hardening

Status: Implemented locally, deployment pending

- [x] Replace dashboard URL credentials with an HTTP-only signed session cookie
- [x] Keep the dashboard and internal navigation URLs free of session credentials and markers
- [x] Add an eight-hour session lifetime, explicit logout, bounded login input, and best-effort login throttling
- [x] Authorize protected API routes from the signed cookie while retaining a temporary legacy-key rollback path
- [x] Add no-store, no-referrer, anti-framing, and MIME-sniffing response headers
- [ ] Deploy, rotate `DIAGNOSTIC_ADMIN_KEY`, and remove the legacy direct-key fallback after the cookie flow is proven

### Slice 6: Manual client engagement entry

Status: Implemented locally, database migration pending

- [x] Add a single `Add client manually` flow to Clients rather than duplicating intake inside Career Tools
- [x] Support every current paid service with service-aware questionnaire fields
- [x] Require explicit verification for EFT, cash, card-machine, and other manual payments
- [x] Store required CVs in the private client bucket with bounded size, type, extension, and file-signature validation
- [x] Reuse the existing engagement ID, Clients record, delivery workflow, and Career Tools selector
- [x] Add an explicit test-record flag that keeps the real workflow while excluding tests from live operations
- [x] Block external strategy-plan delivery for test engagements in both the UI and server route
- [ ] Apply `20260719160000_add_manual_client_engagements.sql` and complete real-browser acceptance with one test Career Clarity and one test Glow Up engagement

## Guardrails

- Auto-pull existing information. Do not ask Kagiso to retype intake answers or upload the same CV again.
- Keep Career Clarity and Glow Up plan templates separate.
- Never fabricate achievements, evidence, client commitments, or statistics.
- Require human approval before client delivery.
- Preserve webhook signature verification and service-role-only writes.
- Do not expose raw webhook payloads in the dashboard.
- Treat CVs, intake answers, session notes, and action plans as private client data.
- Add the AI provider and purpose to the privacy processor disclosure before production plan generation.
- Track review time. If routine approval takes more than 10 to 15 minutes, simplify the draft format before adding more automation.
- Keep manual creation in Clients. Career Tools consumes eligible engagements but does not create a second client record.
- Require verified payment for real manual entries and keep test status separate from payment method.
- Exclude test records from revenue, delivery pressure, generated tasks, calendar events, theme reporting, reminders, and external client delivery.

## Source contracts

- [Cal.com webhooks](https://cal.com/docs/developing/guides/automation/webhooks): signed, versioned webhook payloads; response compatibility must support current `response` and legacy `value` fields.
- [Cal.com create booking](https://cal.com/docs/api-reference/v2/bookings/create-a-booking): custom booking fields use `bookingFieldsResponses` keyed by field slug.
- [Supabase JavaScript upsert](https://supabase.com/docs/reference/javascript/upsert): replay safety uses explicit unique conflict keys.
- [OpenRouter data collection](https://openrouter.ai/docs/guides/privacy/data-collection): prompt and response storage is off by default unless account logging or data-use settings are enabled.
- [OpenRouter zero data retention](https://openrouter.ai/docs/guides/features/zdr): plan requests require zero-data-retention provider routing.
- [OpenRouter provider logging](https://openrouter.ai/docs/guides/privacy/provider-logging/): model providers have separate retention and training policies, so plan requests deny provider data collection.
- [Brevo send transactional email](https://developers.brevo.com/reference/send-transac-email): approved plans use server-rendered text and HTML content and retain the returned provider message ID.
- [Brevo idempotency](https://developers.brevo.com/docs/heterogenous-versions-batch-emails): each reserved delivery UUID is sent as the idempotency key, and uncertain provider outcomes block automatic retries.
- [Next.js cookies API](https://nextjs.org/docs/app/api-reference/functions/cookies): server components read the session cookie and route handlers set or clear it.
- [Next.js authentication guide](https://nextjs.org/docs/app/guides/authentication): session cookies use server-set `httpOnly`, `secure`, `sameSite`, expiry, and path options.

## Verification log

### 19 July 2026

- Confirmed Career Clarity and Glow Up are the only accepted-booking payment services.
- Confirmed booking payment references are deterministic per service and Cal.com booking UID.
- Confirmed the Cal.com webhook verifies `x-cal-signature-256` before parsing.
- Confirmed the webhook does not currently write `intake_submissions`.
- Confirmed the Clients dashboard currently assumes all booking services have intake.
- Added `20260719120000_add_cal_booking_intake_provenance.sql`.
- Added response normalization for current `response`, legacy `value`, and `bookingFieldsResponses` payloads.
- Added CV URL extraction limited to fields identified as a CV, resume, or curriculum vitae field.
- Added replay-safe pending payment creation and intake upsert for Career Clarity and Glow Up.
- Changed the Clients dashboard to show real intake state, intake source, readable multiselect values, and the CV link when present.
- Verification passed: 4 focused tests, TypeScript typecheck, changed-file ESLint, and `git diff --check`.
- The full test suite passed 22 of 23 tests. The unrelated existing AI-model default test expects `z-ai/glm-5.2`, while the current user-owned configuration selects `moonshotai/kimi-k3`. That pre-existing work was not changed in this slice.

Deployment and acceptance work still required:

- A connected-schema check now confirms that the intake provenance columns are available.
- Send a signed Cal.com test booking for each eligible service and confirm one intake row survives a replay.
- Decide whether to backfill previous Career Clarity and Glow Up payloads from private `webhook_logs`.

### Slice 2 implementation evidence

- Added `20260719130000_add_client_strategy_workspaces.sql` with one current workspace per payment and automatic append-only revision snapshots.
- Added an authorized load and save API at `/api/clients/{paymentId}/strategy-workspace`.
- Added a stable `tab=career-tools&client={payment_id}` workspace URL.
- Added eligible-client selection using the shared dashboard `FilterDropdown`.
- Added direct Strategy workspace links to Career Clarity and Glow Up records in Clients.
- Added a source context panel for service, booking time, intake answers, CV reference, and existing notes.
- Added seven structured debrief fields, explicit draft saving, revision feedback, loading, error, and empty states.
- Verification passed: 14 focused booking, intake, and strategy tests; TypeScript typecheck; changed-file ESLint; and `git diff --check`.
- The full suite passed 27 of 28 tests. The same unrelated AI-model default test still expects `z-ai/glm-5.2`, while the current user-owned configuration selects `moonshotai/kimi-k3`.
- A refreshed read-only connected-schema check confirms that the intake provenance fields and strategy workspace table are now available.
- Real-browser save verification remains pending because the connected project has no eligible confirmed engagement to open.

### Slice 3 implementation evidence

- Added `20260719140000_add_client_strategy_plans.sql` with private plan storage, one draft and one approved version per workspace, immutable generated content, editable draft content, and atomic generation and approval functions.
- Added distinct normalized schemas for Career Clarity 14-day follow-up plans and Glow Up 30-day support plans.
- Added source minimization that removes intake contact fields and redacts email addresses, phone numbers, and South African ID numbers before AI processing.
- Added bounded CV extraction from the existing private Supabase object or an approved Cal.com file host. Unreadable or unavailable CVs are reported without blocking an intake-and-debrief draft.
- Added prompt-injection rules, zero em dash and zero contraction normalization, unsupported numerical-detail detection, and strict JSON output validation.
- Restricted personalized plan requests to OpenRouter providers marked for zero data retention and no data collection.
- Added authenticated plan list, generation, draft editing, and approval endpoints.
- Added structured plan editing, source-use visibility, regeneration history, explicit approval locking, and no delivery or export control.
- Updated the public privacy policy to disclose AI-assisted career analysis and drafting, human review, redaction, and restricted routing for personalized plans.
- Verification passed: 16 focused intake, workspace, plan-schema, and CV-privacy tests; TypeScript typecheck; changed-file ESLint; and `git diff --check`.
- A 1440px real-browser pass confirmed the Career Tools and Strategy Workspace shell renders with no console errors. The connected project has no confirmed Career Clarity or Glow Up client, so database-backed plan controls still need acceptance testing after the migration and first eligible booking.
- A refreshed read-only connected-schema check confirms that the strategy plan table is now available.
- The full suite passed 34 of 35 tests. The same unrelated AI-model default test expects `z-ai/glm-5.2`, while the current user-owned configuration selects `moonshotai/kimi-k3`.
- `npm audit --audit-level=high` reports pre-existing high-severity advisories through Next.js 16.2.4 and `ws` 8.20.1. Dependency upgrades should be handled as a separate release-hardening change before production deployment.

### Slice 4 implementation evidence

- Added `20260719150000_add_client_strategy_follow_up.sql` with private delivery reservations and follow-up checkpoints. Both tables use RLS, revoke public and authenticated access, and expose writes only through service-role functions.
- Added one delivery record per approved plan. Only explicit provider rejection becomes retryable; sent, interrupted, or otherwise uncertain deliveries block duplicate attempts until Brevo is checked.
- Added server-rendered, escaped Career Clarity and Glow Up emails. The client cannot supply the recipient, subject, or email body.
- Added explicit recipient confirmation before sending and a Brevo idempotency header derived from the delivery UUID.
- Added Day 7 and Day 14 checkpoints for Career Clarity, plus Day 7, 14, 21, and 30 checkpoints for Glow Up VIP.
- Added completed and skipped outcomes with bounded notes, predefined learning themes, and no mutation path back into the approved plan content.
- Added privacy-safe theme reporting that counts distinct engagement IDs and reveals a theme only after at least three distinct clients share it. The dashboard returns counts only, never client names or notes.
- Verification passed: 6 focused tests for schedules, outcome validation, distinct-client aggregation, escaped email rendering, and provider outcome classification; TypeScript typecheck; changed-file ESLint; tracked and new-file whitespace checks; and protected API route compilation.
- The full suite passed 40 of 41 tests. The same unrelated AI-model default test expects `z-ai/glm-5.2`, while the current user-owned configuration selects `moonshotai/kimi-k3`.
- A 1440px real-browser smoke pass confirmed the protected dashboard route renders with zero current console errors. The approved-plan controls cannot render until an eligible saved plan exists.
- A read-only connected-schema check confirms that `client_strategy_plan_deliveries` and `client_strategy_checkpoints` are available with anonymous access rejected.
- Real delivery acceptance testing remains pending. The connected project has no confirmed Career Clarity or Glow Up client, and no external email was sent during local verification.

### Dashboard access hardening evidence

- Added an HMAC-signed, eight-hour dashboard session stored in an HTTP-only cookie. The signing key remains server-only.
- Added a POST-only login route, generic login errors, a five-failure throttle window, a bounded in-memory attempt map, and a POST-only logout route.
- Changed the dashboard shell, detail pages, and protected API authorization to accept the signed cookie.
- Replaced the browser-facing administrator key with a non-secret component marker and filtered that marker out of links and request URLs.
- Added private no-store caching, no-referrer, anti-framing, and MIME-sniffing response headers for the protected dashboard and session routes.
- Focused session and workspace-link tests, TypeScript typecheck, and changed-file ESLint pass.
- The full suite passes 46 of 47 tests. The only failure is the same unrelated AI-model default mismatch between configured `moonshotai/kimi-k3` and the test's `z-ai/glm-5.2` expectation.
- Real-browser acceptance confirmed a clean invalid-login redirect, clean authenticated URLs, cookie-authorized protected API access, explicit logout, and zero browser errors or warnings.
- Logout remains available in the top bar at 320, 768, 1024, and 1440 pixel viewports.
- The production response probe confirmed `Secure`, `HttpOnly`, `SameSite=Strict`, path `/`, and an eight-hour cookie lifetime.
- A local verification command exposed the current administrator key in diagnostic output. It was not written to source or browser artifacts, but the key must be rotated before deployment.
- The legacy direct API key path remains temporarily available for rollback. Rotate `DIAGNOSTIC_ADMIN_KEY` at deployment, then remove that fallback after production acceptance.

### Manual client engagement evidence

- Added `20260719160000_add_manual_client_engagements.sql` with manual payment provenance, confirmation actor, and an explicit test flag.
- Added an authenticated multipart endpoint at `/api/clients/manual` that authorizes before parsing the request, caps the body, validates service-aware fields, checks likely duplicates, and rolls back partial database and storage writes.
- Added PDF and Word validation across filename extension, browser MIME type, byte size, and file signature before private upload.
- Added the single-page manual form to Clients with payment verification, service-specific questionnaire fields, CV capture, optional session date, duplicate confirmation, and a direct Strategy Workspace handoff.
- Added manual payment and intake provenance to Client records and a visible test label in Clients, Finance, and Career Tools.
- Excluded test records from revenue, delivery pressure, generated tasks, calendar events, intake reminders, and aggregate learning themes.
- Blocked Brevo strategy-plan delivery for test engagements before a delivery reservation can be created.
- Restricted the existing batch cleanup UI and endpoint to records where `is_test = true`; real payments are no longer listed or accepted by that destructive path, and private test CV objects are removed during cleanup.
- Verification passed: 7 focused validation tests, TypeScript typecheck, changed-file ESLint, whitespace checks, and a production build.
- The full suite passes 53 of 54 tests. The unrelated model-default assertion expects `z-ai/glm-5.2`, while the current user-owned configuration selects `anthropic/claude-fable-5`.
- A 1440px real-browser pass confirmed the modal layout, service switching, R800 to R1,200 amount update, service-specific question update, and clean close behavior with zero browser errors or warnings.
- `npm audit --audit-level=high` reports 2 high, 5 moderate, and 1 low pre-existing advisories, including Next.js and `ws`; dependency upgrades remain a separate release-hardening task.
- Supabase CLI reports that this workspace is not linked to a project, and no database connection URL is configured locally. The migration must be applied through the intended Supabase project before record-creation acceptance testing.

### Slice 7: 30-day strategy-client rework access

Status: Implemented locally, database acceptance pending

- [x] Keep active Career Clarity and Glow Up clients available in Career Tools.
- [x] Keep delivered strategy clients selectable for 30 days from their final delivery milestone.
- [x] Show the remaining rework window in the Career Tools selector and Clients action.
- [x] Keep older completed clients in Clients history without exposing them in the default strategy selector.
- [x] Keep test records on the same selection rule while preserving their external-delivery safeguards.
- [x] Preserve existing versioned-plan behavior so rework generates a new plan version instead of overwriting an approved or sent plan.
- [x] Add unit coverage for active, recently completed, expired, invalid-date, unrelated-service, and test-label states.
- [ ] Apply the manual-engagement migration and verify the selector with synthetic Career Clarity and Glow Up records.

### 21 July 2026: 30-day rework access evidence

- Added `CLIENT_STRATEGY_REOPEN_WINDOW_DAYS` and a pure access decision helper in `lib/client-strategy.ts`.
- Changed Career Tools from the ambiguous “Choose paid client” label to “Choose client”.
- Career Tools now lists active and recently completed strategy clients only, with explicit status and remaining-day labels.
- Clients now shows the remaining strategy rework window and explains when an older completed client has left the selector.
- The default window uses `deliveredAt`, which is derived from the final completed delivery milestone. It does not delete or mutate historical client records after 30 days.
- Verification passed: 11 focused strategy tests, TypeScript typecheck, full lint, production build, and real-browser checks at 320px and 1440px with zero console warnings and no horizontal overflow.
- The full suite passes 59 of 60 tests. The only failure remains the unrelated AI-model default assertion expecting `z-ai/glm-5.2`, while the current user-owned configuration selects `anthropic/claude-fable-5`.
- A connected read-only Supabase check still reports that `payments.is_test` does not exist. Apply `20260719160000_add_manual_client_engagements.sql` before creating manual or synthetic engagements.

## Decisions

- ADR 001: [Use engagement-scoped intake before introducing permanent client identity](decisions/ADR-001-client-strategy-workspace-engagement-data.md)
- ADR 002: [Keep the strategy workspace in Career Tools and audit saves in PostgreSQL](decisions/ADR-002-career-tools-strategy-workspace-and-revisions.md)
- ADR 003: [Reserve approved-plan delivery and aggregate only thresholded themes](decisions/ADR-003-strategy-plan-delivery-and-learning-privacy.md)
- ADR 004: [Use a signed HTTP-only session for the private dashboard](decisions/ADR-004-signed-dashboard-session.md)
- ADR 005: [Use Clients as the manual engagement entry point](decisions/ADR-005-use-clients-as-the-manual-engagement-entry-point.md)

## Next action

Apply the manual-engagement migration, then create one test Career Clarity and one test Glow Up engagement from Clients. Verify both appear in Career Tools, confirm the 30-day labels, complete the debrief and plan workflow, and confirm that external delivery stays blocked. Deploy the signed-session change and rotate `DIAGNOSTIC_ADMIN_KEY`; after production acceptance, remove the temporary direct-key API fallback.
