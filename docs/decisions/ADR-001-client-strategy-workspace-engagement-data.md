# ADR 001: Use engagement-scoped intake before permanent client identity

Status: Accepted  
Date: 19 July 2026

## Context

Career Clarity and Glow Up already cross Cal.com, a private PayFast checkout, Supabase payments, and the dashboard. Each accepted booking has a deterministic `payment_id` derived from the service and Cal.com booking UID.

The new client strategy workspace needs booking intake before it can generate useful session follow-up plans. The repository does not yet have a stable person-level client table, and building one first would expand the initial slice into identity matching, merging, and migration work.

Cal.com may retry webhook delivery. The intake write therefore needs an external idempotency key that does not depend on webhook-log order or a person's email address.

## Decision

For V1, persist Cal.com intake against the existing deterministic booking `payment_id` and treat that payment as the engagement identity.

Add provenance to `intake_submissions`:

- `source = 'cal'`
- `source_reference = booking UID`
- `source_metadata` for event slug, booking times, and webhook version

Enforce uniqueness on `source` plus `source_reference`. Use a Supabase upsert with that conflict key so webhook retries update the same intake.

Create the pending payment row during the eligible Cal.com webhook if it does not already exist. Do not overwrite an existing payment, because a replay or reopened checkout must never change a confirmed payment back to pending.

Only Career Clarity and Glow Up use this path. Discovery calls and masterclasses remain outside the engagement plan engine.

## Consequences

Positive:

- The first usable data slice can ship without manual re-entry.
- Cal.com intake is available as soon as a booking is accepted, before checkout is opened.
- Webhook retries are safe.
- Existing PayFast, intake, and Clients dashboard joins continue to work.

Trade-offs:

- Repeat purchases by one person still appear as separate engagements.
- Person-level history and cross-service insights remain limited until `client_id` exists.
- A Cal.com CV URL is initially stored as a source reference. Copying it into controlled Supabase storage is a later hardening slice.

## Follow-up decision

Introduce a stable `clients` table and `client_id` only when the workspace needs cross-engagement history. Matching must use verified identifiers and a manual merge path, not silent email-only merging.
