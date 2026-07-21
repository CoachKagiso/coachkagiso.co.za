# ADR 003: Reserve approved-plan delivery and aggregate only thresholded themes

Status: Accepted  
Date: 19 July 2026

## Context

Approved Career Clarity and Glow Up plans need a client delivery workflow and a way to record follow-up learning. Email providers can accept a request even when the application does not receive or persist a clean response. Retrying blindly can send the same private plan twice.

Checkpoint notes also contain private client context. Product learning needs useful patterns without turning the dashboard into a client-identification report.

## Decision

Reserve one database delivery UUID per approved plan before contacting Brevo. Send that UUID as the provider idempotency key. Only an explicit provider rejection marks the reservation as failed and allows a reviewed retry with the same UUID. A sent reservation cannot be retried. Network interruptions, missing provider message IDs, and database completion failures leave an uncertain in-progress reservation that blocks retry until Brevo is checked.

Build the recipient, subject, text, and HTML on the server from the payment and locked approved content. The dashboard only submits the plan identity and an explicit confirmation.

Create service-specific checkpoints only after Brevo accepts the email and the delivery transaction completes. Store checkpoint status, progress, notes, and predefined themes separately from the immutable approved plan.

Aggregate themes by distinct engagement. Return a theme to the dashboard only after at least three distinct engagements share it. Return counts and labels only, with no names or notes.

## Consequences

- The system avoids normal duplicate sends and makes uncertain outcomes visible for manual reconciliation.
- The approved plan remains a stable record of what the client received.
- Theme reporting supports service validation without exposing individual follow-up records.
- The three-engagement threshold reduces disclosure risk but is not a substitute for consent, retention limits, or access control.
- Delivery reconciliation remains manual when Brevo accepts a message but the database completion step fails.
