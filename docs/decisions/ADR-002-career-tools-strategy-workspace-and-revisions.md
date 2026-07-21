# ADR 002: Keep the strategy workspace in Career Tools and audit saves in PostgreSQL

Status: Accepted; dashboard-key clause superseded by ADR 004  
Date: 19 July 2026

## Context

The dashboard already has two relevant entry points. Clients contains the paid engagement and delivery record, while Career Tools contains the CV Positioning Analyzer. The new workspace needs to be reachable from both without creating a second private dashboard shell or asking Kagiso to select the same client repeatedly.

The session debrief will become source material for a personalized client plan. Silent overwrites would make it difficult to understand what changed between the session, the first draft, and later follow-up work.

## Decision

Use the existing Career Tools tab as the workspace host. A selected engagement has the stable dashboard URL:

`/resources/career-diagnostic/submissions?tab=career-tools&client={payment_id}`

At implementation time, the workspace preserved the existing dashboard key in the query string because that was the private-dashboard authentication convention. ADR 004 supersedes that clause: the workspace URL is now clean and access is authorized by a signed HTTP-only session cookie.

Store one current workspace per paid engagement in `client_strategy_workspaces`. Store the seven structured session debrief fields as JSON so the schema stays aligned with the typed application contract.

Create `client_strategy_workspace_revisions` as an append-only snapshot table. PostgreSQL triggers increment the workspace version and write the revision after every insert or update. The API saves only the current workspace. It cannot accidentally skip the audit write.

Only confirmed Career Clarity and Glow Up payments can load or save a strategy workspace.

## Alternatives considered

### A separate strategy-workspace page

This would duplicate the dashboard navigation, authentication, client loading, and responsive shell. It was rejected because Career Tools is already the conceptual home for the analyzer and future plan generator.

### Store the debrief as a general dashboard note

General notes are useful for unstructured delivery context, but they cannot reliably distinguish decisions, commitments, blockers, evidence, and tone. This was rejected because the plan generator needs a predictable source contract.

### Create revision rows in the browser or API

This would require two writes and could leave the current workspace updated without an audit row. It was rejected in favor of a database trigger that keeps the save and revision in the same transaction.

## Consequences

Positive:

- Career Tools and Clients point to the same engagement workspace.
- Intake, CV reference, notes, and debrief appear together without re-entry.
- Every save has a revision number and immutable snapshot.
- The next plan-generation slice receives structured, validated context.

Trade-offs:

- Dashboard authentication is now handled by the signed-session decision in ADR 004.
- Workspace save cannot operate until the new Supabase migration is applied.
- Revision history is captured in V1 but not yet exposed as a restore interface.
