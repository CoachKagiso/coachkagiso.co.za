# Career Tools Redesign — Full Plan

> Generated: 27 July 2026
> Context: Technical audit + redesign of the Career Tools tab in the Coach Kagiso dashboard.

---

## 1. What This Is About

The Career Tools tab (currently `?tab=career-tools` on `/resources/career-diagnostic/submissions`) is being restructured to match how Kagiso actually works with clients. Currently the tab has two disconnected pieces — a "Client Strategy Workspace" (with Session Debrief + Plan generation) and a standalone "CV Positioning Analyzer" — that don't share data or client context. The goal is to merge them into a single client workspace with a clear workflow: select a client, see their profile, analyze their CV, then generate a follow-up plan.

---

## 2. Current Architecture

### Single-page dashboard

All tabs (dashboard, leads, pipeline, clients, finance, career-tools, etc.) are rendered from a single page component at:

**`app/resources/career-diagnostic/submissions/page.tsx`**

Tab switching is controlled by a `?tab=` query parameter.

### Career Tools tab currently renders two independent components

```
page.tsx:2259-2269
└── activeTab === 'career-tools'
    ├── ClientStrategyWorkspace (line 2261)
    │   props: { adminKey, clients, selectedPaymentId }
    │   ├── Dropdown: "Select Career Clarity or Glow Up client"
    │   ├── Empty state: "Choose the client you are preparing for."
    │   └── When client selected:
    │       ├── ClientStrategyContext (dark sidebar)
    │       │   ├── Name, email, service badge
    │       │   ├── Intake source, session date
    │       │   ├── CV file link ("Open CV source") ← TO BE REMOVED
    │       │   ├── Intake answers (onboarding questions)
    │       │   └── Existing notes
    │       ├── SessionDebriefEditor (7 text fields)
    │       │   ├── clarityShift, blockers, strengthsEvidence
    │       │   ├── decisions, clientCommitments, coachCommitments, toneNotes
    │       └── ClientStrategyPlanPanel
    │           ├── Generate/edit/approve 14-day (career-clarity) or 30-day (glow-up-vip) plan
    │           └── Follow-up checkpoints
    │
    └── CvAnalyzerDashboard (line 2267) — COMPLETELY STANDALONE
        props: { adminKey }
        ├── Upload/paste CV, job description, advanced mode
        ├── Analyze → Positioning report (scores, fixes, rewrite samples)
        ├── Generate deliverables (ATS CV, cover letter, LinkedIn copy)
        └── Results held in React state only — lost on refresh
```

### Key problems identified

| Problem | Detail |
|---------|--------|
| **No client context in CV Analyzer** | CV Analyzer receives only `adminKey` — no idea which client is selected |
| **CV results not persisted** | "No report saved" badge is permanent. Results lost on page refresh. |
| **Intake data not used in CV analysis** | Analyze prompt includes only CV text + optional job description. No intake questions. |
| **CV analysis not used in plan generation** | Plan generator re-derives CV info from raw CV text. Ignores structured analysis scores/fixes. |
| **Debrief pre-population bug** | Test client shows pre-filled debrief fields. Root cause: `test-entries.sql` inserted hardcoded JSONB directly. |
| **CV upload in manual form** | The manual client form requires CV upload. Kagiso wants CV uploaded in the Analyzer instead. |
| **Dropdown limited to 2 services** | Only career-clarity and glow-up-vip clients appear in the dropdown. CV services are invisible. |
| **CV storage path fragmentation** | 3 different path patterns depending on source (manual form, intake form, Cal.com). |

---

## 3. Target Architecture

```
Career Tools Tab
│
├── TOP SECTION: Client Profile + Selector
│   │
│   │  ┌── Dropdown: All paid clients (all 7 service types) ──────────┐
│   │  │   Active / Delivered status labels                          │
│   │  │   No time-based exclusion for Type A (CV) services          │
│   │  └─────────────────────────────────────────────────────────────│
│   │
│   │  ┌── When client selected ─────────────────────────────────────┐
│   │  │  CLIENT PROFILE CARD                                       │
│   │  │  ├── Name, email, WhatsApp                                  │
│   │  │  ├── Service type + green badge                             │
│   │  │  ├── Session/kick-off date (if applicable)                  │
│   │  │  ├── Payment status / confirmed date                        │
│   │  │  │                                                          │
│   │  │  │  INTAKE ANSWERS (service-specific onboarding questions)  │
│   │  │  │   ├── Current role & career situation                    │
│   │  │  │   ├── Target role / desired outcome                      │
│   │  │  │   ├── Biggest blocker / challenge                        │
│   │  │  │   ├── Decision needed / interview history                │
│   │  │  │   └── (service-specific fields)                          │
│   │  │  │                                                          │
│   │  │  │  EXISTING NOTES (if any)                                 │
│   │  │  └──────────────────────────────────────────────────────────│
│   │  └──────────────────────────────────────────────────────────────│
│
├── MIDDLE SECTION: Tab A + Tab B
│   │
│   │  [Tab A] "Session Debrief + Plan" (only for career-clarity & glow-up-vip)
│   │  │    ├── SessionDebriefEditor (7 fields, manual save only)
│   │  │    └── ClientStrategyPlanPanel
│   │  │        ├── Generate 14-day or 30-day plan
│   │  │        ├── Review, edit, approve
│   │  │        └── Follow-up checkpoints + send
│   │  │
│   │  └── [Tab B] "CV Analyzer" (all service types)
│   │       ├── Client name in header: "CV Analysis for {Name}"
│   │       ├── Upload CV / paste text
│   │       ├── Job description input
│   │       ├── Simple / Advanced mode
│   │       ├── [Analyze] button
│   │       ├── Positioning report (scores, fixes, rewrites)
│   │       ├── Generate deliverables (ATS CV, cover letter, LinkedIn)
│   │       └── Shows "Last analyzed: 21 Jul 2026, 14:28" + [Re-analyze]
│
└── UNDER THE HOOD: Data flow
    ├── CV upload → saved to clients/{paymentId}/cv.pdf → updates payments.current_cv_path
    ├── Analyze → saves report to cv_analysis_reports → shows cached report on revisit
    ├── Plan generation → reads intake + debrief + cv_analysis report (if exists)
    └── Follow-up → checkpoints at Day 7, 14 (career-clarity) or Day 7, 14, 21, 30 (glow-up-vip)
```

---

## 4. Technical Audit Findings

### 4.1 Session Debrief Pre-population

**Root cause:** `G:\AntiGravity Projects\coach-kagiso\test-entries.sql`, lines 82-104 and 188-210.

This SQL file directly inserts hardcoded, fully-populated debrief JSONB into `client_strategy_workspaces` for the test client "Loretta Danielson." The application code has NO auto-generation path for debrief content. No AI writes to debrief. No webhook writes debrief. No triggers populate it.

**The only writer of debrief content in application code is the human clicking "Save debrief"** in `ClientStrategyWorkspace.tsx:111`.

**Clear SQL:**
```sql
UPDATE public.client_strategy_workspaces
SET debrief = '{}'::jsonb
WHERE payment_id IN ('manual-career-clarity-test-001', 'manual-glow-up-vip-test-002');
```

The existing `prepare_client_strategy_workspace_revision_trigger` (migration `20260719130000.sql:81-83`) will auto-increment `version` and log the revision. No cascade risk.

### 4.2 CV Analyzer Analyze Prompt

**File:** `app/api/tools/cv-analyzer/route.ts:231-262`

Currently sends to AI:
1. CV text only (paste or uploaded file)
2. Optional job description
3. Optional context notes (manually typed in Advanced mode)
4. Career goal + seniority (Advanced mode only)

**Does NOT include:** client intake answers, client name, service type, or any data from `intake_submissions`.

**Change needed:** Add optional `intakeData` parameter to the API route. Include it as `<client_intake>` XML tag in the prompt when available. Run CV-only analysis when absent (no error).

### 4.3 Plan Generation Prompt

**File:** `lib/client-strategy-plan.ts:218-278`

Current data sources:
1. **Intake data** — sanitized (PII redacted) from `intake_submissions`
2. **Session Debrief** — 7 fields from `client_strategy_workspaces`
3. **Raw CV text** — extracted from `cv_file_url`

**Does NOT use:** CV Analyzer output (scores, priority fixes, recommended coaching move).

**Change needed:** Add optional `cvAnalysis` parameter to `buildClientStrategyPlanUserPrompt()`. When available, include as `<cv_analysis>` XML tag. System prompt updated to prefer structured analysis over raw CV text.

### 4.4 CV Report Persistence

**Current:** CV Analyzer results live in React `useState` only. Lost on refresh. UI badge: "No report saved" (`CvAnalyzerDashboard.tsx:572`).

**Change needed:** New table `cv_analysis_reports` with columns:
- `id` (uuid, PK)
- `payment_id` (text, FK → payments)
- `report` (jsonb — full CvAnalyzerResult)
- `analysis_mode` (text — 'simple' or 'advanced')
- `target_role` (text, nullable)
- `cv_file_name` (text)
- `version` (integer, auto-increment)
- `created_at` (timestamptz)

### 4.5 Component Architecture

**Current:** `ClientStrategyWorkspace` and `CvAnalyzerDashboard` are siblings in `page.tsx:2259-2269`. No shared state, no event communication.

**Change:** Merge into one component with two tabs (Tab A: "Session Debrief + Plan", Tab B: "CV Analyzer"), both sharing the selected client context from the dropdown.

### 4.6 Existing client CV access

**`intake_submissions.cv_file_url` stores a signed URL** (not a raw storage path), confirmed in:
- `manual/route.ts:155-160` — stores `signed.data.signedUrl`
- `intake/submit/route.ts:142-149` — stores `signedData.signedUrl`

**Fix:** Universal fallback in `buildClientList()` — extract storage path from existing signed URLs to re-sign them, plus add `payments.current_cv_path` for future uploads.

### 4.7 Database triggers

`prepare_client_strategy_workspace_revision_trigger` fires **before update** on `client_strategy_workspaces` and increments `version` + sets `updated_at` (`20260719130000.sql:37-50, 81-83`).

`audit_client_strategy_workspace_revision_trigger` fires **after insert or update** and writes a snapshot to `client_strategy_workspace_revisions` (`20260719130000.sql:52-76, 88-90`).

### 4.8 Test client flag

- Column: `payments.is_test` (boolean, default false)
- Set only via manual form checkbox (`ManualClientEngagementForm.tsx:291-294`)
- Blocks: email sending, plan delivery, revenue counting, dashboard tasks, calendar events
- Does NOT block: AI generation (plan generation, CV analysis)
- Visually distinguished: purple "Test" badges throughout UI; hidden from stats by default

---

## 5. Complete Changes Summary

| # | File | Change |
|---|------|--------|
| **CV upload removal** | | |
| 1 | `ManualClientEngagementForm.tsx:390-400` | Remove CV file upload field |
| 2 | `manual-client-engagement.ts:161-167` | Remove `manualClientRequiresCv()` function |
| 3 | `manual/route.ts:100-104` | Remove CV requirement check |
| 4 | `ClientStrategyContext.tsx:72-93` | Remove CV file link |
| 5 | `ClientsDashboard.tsx:216-218` | Remove CV link from client list |
| **Dropdown widening** | | |
| 6 | `lib/client-strategy.ts` | Consolidate `getClientStrategyAccess()` with capability flags and one status enum |
| 7 | `lib/client-strategy.ts` | Add `buildClientWorkspaceClientChoiceLabel()` |
| 8 | `ClientStrategyWorkspace.tsx:39-53` | Use new access function for dropdown |
| 9 | `ClientStrategyWorkspace.tsx:~202` | Gate Tab A behind `isClientStrategyServiceSlug()` |
| **Debrief removal** | | |
| 10 | `ClientStrategyWorkspace.tsx` | Remove `SessionDebriefEditor` import and rendering |
| 11 | `SessionDebriefEditor.tsx` | Remove file (no longer used) |
| 12 | `lib/client-strategy.ts:25-61` | Can keep `SESSION_DEBRIEF_FIELDS` — still used by plan generation prompt |
| **Single CV pointer** | | |
| 13 | DB migration | `ALTER TABLE payments ADD COLUMN current_cv_path text` |
| 14 | `lib/clients.ts` | Add `currentCvUrl` to `ClientRecord` with three-tier fallback resolver |
| 15 | `manual/route.ts:145` | Change upload path to `clients/{paymentId}/cv.pdf` with `upsert: true` |
| 16 | `intake/submit/route.ts:129` | Change upload path to same convention |
| 17 | New route | `POST /api/clients/[paymentId]/cv` — CV upload from Analyzer |
| 18 | `lib/client-strategy-cv-server.ts:62-106` | Read from `payments.current_cv_path` first, fallback to intake |
| **CV Analyzer linked to client** | | |
| 19 | `CvAnalyzerDashboard.tsx:360` | Accept new `selectedClient?: ClientRecord` prop |
| 20 | `cv-analyzer/route.ts:231-262` | Accept optional `intakeData`, include in prompt |
| 21 | `CvAnalyzerDashboard.tsx` | On client selected: show name in header, pass intake data to API |
| 22 | DB migration | Create `cv_analysis_reports` table |
| 23 | `CvAnalyzerDashboard.tsx` | Add save-on-analyze + load-cached-report-on-mount |
| 24 | CV Analyzer API route | After analysis completes, upsert report to `cv_analysis_reports` |
| **CV analysis → Plan feed** | | |
| 25 | `client-strategy-plan.ts:262-278` | Add optional `cvAnalysis` parameter to user prompt |
| 26 | `client-strategy-plan.ts:218-259` | Update system prompt to prefer structured analysis |
| 27 | `strategy-plan/route.ts:80-87` | Query `cv_analysis_reports` for latest report; include in prompt |
| **Tab architecture** | | |
| 28 | `ClientStrategyWorkspace.tsx` | Add tab UI (Tab A / Tab B) below client profile |
| 29 | `page.tsx:2259-2269` | Stop rendering CvAnalyzerDashboard as sibling |
| **Database cleanup** | | |
| 30 | Run SQL | Clear test debrief data from `test-entries.sql` |
| **Backward compat** | | |
| 31 | `lib/clients.ts` | `resolveClientCvUrl()` fallback for existing signed URLs |

---

## 6. Data Model Changes

### 6.1 New column on `payments`

```sql
ALTER TABLE public.payments
  ADD COLUMN current_cv_path text;

COMMENT ON COLUMN public.payments.current_cv_path IS
  'Single storage path to the current CV for this client. Overwritten by any source (intake, manual, analyzer).';
```

### 6.2 New table `cv_analysis_reports`

```sql
CREATE TABLE public.cv_analysis_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text NOT NULL REFERENCES public.payments(payment_id) ON DELETE CASCADE,
  report jsonb NOT NULL,
  analysis_mode text NOT NULL DEFAULT 'simple',
  target_role text,
  cv_file_name text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cv_analysis_reports_payment
  ON public.cv_analysis_reports (payment_id, created_at DESC);
```

### 6.3 Storage path convention

All CV uploads use a fixed path per client so uploads naturally overwrite:

```
clients/{paymentId}/cv.pdf
```

Used with `upsert: true` on `supabase.storage.upload()`. Replaces all existing path patterns.

---

## 7. Service Type Map

| Service Slug | Title | Type | Tab A (Debrief+Plan)? | Tab B (CV Analyzer)? |
|-------------|-------|------|----------------------|---------------------|
| `career-clarity` | Career Clarity Session | Booking | Yes | Yes |
| `glow-up-vip` | Glow Up VIP Package | Booking | Yes | Yes |
| `cv-review` | 48-Hour CV Review | Delivery | No | Yes |
| `cv-revamp` | CV Revamp | Delivery | No | Yes |
| `cover-letter` | Cover Letter | Delivery | No | Yes |
| `linkedin` | LinkedIn Optimisation | Delivery | No | Yes |
| `bundle` | CV + LinkedIn Bundle | Delivery | No | Yes |

Tab A gating logic: `isClientStrategyServiceSlug(selectedClient.serviceSlug)`

---

## 8. Open Questions Resolved

| Question | Answer |
|----------|--------|
| What should determine active/archived for non-strategy clients? | **Always selectable. No time-based exclusion.** Two statuses: `active` (not delivered) and `delivered` (completed). Never expires. |
| Backfill migration or universal fallback for existing CV URLs? | **Universal fallback in code** — extract storage path from existing signed URLs, re-sign on every page load. Backfill migration is optional cleanup. |
| Should the debrief form stay? | **Removed entirely.** Tab A replaces it with client profile data. |
| CV source in Analyzer? | **Fresh upload each time.** Show intake CV as default if available, allow replacement. |
| Should CV results persist? | **Yes.** New `cv_analysis_reports` table. "Last analyzed: [date]" + [Re-analyze] button. |
| Should plan generation use CV analysis output? | **Yes.** Structured analysis included in prompt alongside intake + debrief. One-way dependency. |
| Existing plans from old debrief-based flow? | **Keep as-is.** They already have source snapshots. New plans use the new prompt. |
| The 5 "Generate ATS CV / Cover Letter / LinkedIn" buttons? | **Stay in Tab B** (CV Analyzer output panel), separate from the 14/30-day action plan. |

---

## 9. File Index

| Path | Purpose |
|------|---------|
| `app/resources/career-diagnostic/submissions/page.tsx` | Dashboard page — renders all tabs, passes client data |
| `components/career-tools/ClientStrategyWorkspace.tsx` | Main workspace component (to become tab container) |
| `components/career-tools/CvAnalyzerDashboard.tsx` | CV Positioning Analyzer (to accept client context) |
| `components/career-tools/ClientStrategyContext.tsx` | Read-only client profile sidebar |
| `components/career-tools/SessionDebriefEditor.tsx` | 7-field debrief form (to be removed) |
| `components/career-tools/ClientStrategyPlanPanel.tsx` | Plan generation, review, approve UI |
| `components/career-tools/ClientStrategyFollowUpPanel.tsx` | Checkpoint follow-up tracking |
| `components/career-tools/ClientStrategyPlanReview.tsx` | Plan content review |
| `lib/client-strategy.ts` | Strategy types, access logic, debrief schema |
| `lib/client-strategy-plan.ts` | Plan types, prompt builders, normalization |
| `lib/client-strategy-store.ts` | Supabase CRUD for workspaces and plans |
| `lib/client-strategy-cv-server.ts` | CV text loading and redaction |
| `lib/client-strategy-follow-up-store.ts` | Follow-up checkpoint data |
| `lib/clients.ts` | Client record builder, CV URL resolver |
| `lib/manual-client-engagement.ts` | Manual form types + normalization |
| `lib/cal-booking-intake.ts` | Cal.com intake extraction |
| `lib/ai-models.ts` | AI model configuration |
| `lib/ai-config.ts` | AI runtime configuration |
| `lib/payfast.ts` | PayFast integration, sandbox toggle |
| `lib/buying-flow.ts` | Service definitions, intake fields |
| `lib/cv-upload-validation.ts` | CV file validation (magic bytes, size) |
| `app/api/tools/cv-analyzer/route.ts` | CV analysis AI endpoint |
| `app/api/clients/manual/route.ts` | Manual client creation |
| `app/api/clients/[paymentId]/strategy-workspace/route.ts` | Workspace load/save |
| `app/api/clients/[paymentId]/strategy-plan/route.ts` | Plan generation endpoint |
| `app/api/intake/submit/route.ts` | Client intake form submission |
| `app/api/webhooks/cal/route.ts` | Cal.com booking webhook |
| `app/api/payfast/notify/route.ts` | PayFast payment notification |
| `supabase/migrations/20260719130000_add_client_strategy_workspaces.sql` | Workspace + revision triggers |
| `test-entries.sql` | Test fixture data (source of debrief bug) |

---

## 10. Final implementation decisions (27 July 2026)

This section supersedes the earlier target-architecture/open-question notes above where they differ from the approved build scope.

- The client selector defaults to `active` and `recently-completed` records. Search and **Show all clients** reveal retained records outside that view, but archived Career Clarity and Glow Up VIP records remain disabled and cannot reopen Strategy work.
- The supported Career Tools services are exactly five CV services (`cv-review`, `cv-revamp`, `cover-letter`, `linkedin`, `bundle`) plus Career Clarity and Glow Up VIP. Other products, including Masterclass, are ineligible for this workspace.
- CV-only clients render only CV Analyzer. Coaching clients render CV Analyzer and Session Debrief + Plan. The last tab is remembered per client; the first visit defaults to CV Analyzer.
- The debrief is retained as a human-entered, three-field record: what shifted, commitments made, and tone or sensitivity notes. It is never generated on load or by an analyzer call.
- `current_cv_path` is a pointer to the latest retained CV version. Analyzer uploads use `clients/{paymentId}/cv-history/{uuid}.{ext}` with the validated `pdf`, `docx`, or `txt` extension and append a `client_cv_versions` row. Replacing a file changes the pointer but never deletes the previous version.
- Legacy intake CV URLs remain the fallback when the pointer is empty. Supabase storage URLs are resolved as storage paths; Cal.com URLs remain external until Kagiso uploads a replacement through Career Tools.
- CV Analyzer reports are append-only timestamped rows in `cv_analysis_reports`. Opening a workspace loads the latest saved report and never calls AI. Plan generation uses the latest saved report when available, otherwise raw CV text, and never triggers a new analysis.
- No automatic deletion of client records, intake data, debriefs, plans, CV versions, or analysis reports is part of this redesign. The migration clears only the two fabricated test debrief payloads using the existing revision trigger.

---

*End of document.*
