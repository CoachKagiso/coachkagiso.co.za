# ADR 005: Use Clients as the manual engagement entry point

## Status

Accepted

## Date

19 July 2026

## Context

The automatic buying flow creates payment and intake records from PayFast and Cal.com. That path cannot represent a client who pays by EFT, cash, card machine, or another verified offline method. It also leaves the strategy workspace without an eligible engagement when no live client exists for acceptance testing.

Career Tools already selects eligible Career Clarity and Glow Up engagements from the same confirmed records shown in Clients. Creating a second manual form inside Career Tools would duplicate service, payment, intake, and CV capture and would make the two entry paths drift.

The current data model treats `payment_id` as the engagement identity. It does not yet have a permanent person-level client table.

## Decision

Place `Add client manually` in the Clients tab. The protected endpoint creates the same canonical engagement shape as the automated path:

- one confirmed payment with `payment_provider = 'manual'`
- one service-aware intake with `source = 'manual_dashboard'`
- one private CV object when the service requires a CV
- one generated engagement ID used by Clients, delivery milestones, notes, and Career Tools

Manual real-client entries require explicit payment verification. Test entries use the same form and data path, but set `is_test = true`.

Career Tools remains a downstream delivery workspace. It does not own client creation. It continues to show only Career Clarity and Glow Up engagements in its client selector.

Test status is orthogonal to payment method. Test engagements are excluded from live revenue, operational tasks, calendar events, and learning-theme reports. External strategy-plan delivery is blocked in both the UI and the server route.

## Alternatives considered

### Separate Safe Test Client mode

- Advantage: strong visual separation from real clients
- Rejected: duplicates the real workflow and can hide defects that only occur in the real manual-entry path

### Manual form inside Career Tools

- Advantage: close to plan generation
- Rejected: Career Tools would become a second source for payment and intake records, while non-strategy services would still need another manual path

### Insert confirmed payments directly in Supabase

- Advantage: minimal interface work
- Rejected: bypasses validation, private file handling, duplicate checks, audit fields, and test-data safeguards

### Introduce a permanent clients table first

- Advantage: one person could own multiple engagements
- Deferred: identity matching and merging are outside this slice. The existing engagement identity is enough to support manual capture without blocking future `client_id` work.

## Consequences

- Automatic and manual buyers converge on the same Clients and Career Tools behavior.
- Offline payments are represented honestly instead of being labelled as PayFast.
- A repeat buyer still appears once per purchased engagement until a stable `client_id` is introduced.
- The database migration must be applied before the manual form can create records.
- Test records remain visible only when explicitly shown and cannot affect live operating figures or client delivery.
