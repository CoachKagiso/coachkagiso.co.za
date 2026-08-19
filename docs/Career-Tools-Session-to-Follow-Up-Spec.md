# Career Tools: Session to Follow-Up Specification

> Status: Working product and implementation specification
> Date: 29 July 2026
> Product: Coach Kagiso Career Tools
> Primary services: Career Clarity and Glow Up VIP

This document is the current working source of truth for the Career Tools workflow from session preparation through follow-up delivery. It consolidates the product decisions, coaching model, content rules, layout decisions, safety boundaries, and implementation requirements discussed so far.

It supersedes older descriptions that treat the plan as only a 14-day or 30-day AI document, or that model follow-up as multiple generic checkpoints. The plan and the follow-up service are related, but they are not the same thing.

---

## 1. Executive summary

Career Tools should help Kagiso move through one coherent coaching workflow:

```text
Client context
    -> CV analysis
    -> private session preparation
    -> 60-minute coaching session
    -> evidence and reviewed debrief
    -> career development plan
    -> service-specific follow-up
    -> follow-up outcome and next commitment
```

The system has three different kinds of output:

1. **Private preparation**: what Kagiso needs before and during the session.
2. **Private debrief**: what actually happened in the session and what requires careful interpretation.
3. **Client plan and follow-up**: the reviewed career development roadmap, plus the service contact Kagiso has promised to provide.

The central product principle is continuity. The client should receive a plan that reflects the conversation they actually had, not a generic AI plan assembled from the original intake alone.

---

## 2. Service promises

| Service | Live session | Career development plan | Follow-up promise |
|---|---|---|---|
| Career Clarity | One 60-minute session on Microsoft Teams | Focused development plan with an immediate 14-day action sprint and longer-term direction | One 15-minute Microsoft Teams follow-up at approximately day 14 |
| Glow Up VIP | One 60-minute session on Microsoft Teams | Fuller development plan connecting direction, CV, LinkedIn, applications and interview readiness | One WhatsApp progress message plus one 15-minute Microsoft Teams follow-up session |

### 2.1 Career Clarity

Career Clarity is a focused intervention. It should help the client:

- separate situational frustration from a durable career need;
- decide what direction or role criteria deserve attention;
- identify the evidence and positioning that need to become clearer;
- choose a small number of immediate actions;
- leave with a realistic first-14-days action sprint;
- use the day-14 call to review progress, blockers and the next decision.

The 14 days describe the initial action period and the intended follow-up point. The plan may still contain 30-, 60- and 90-day direction markers, but it must not promise more follow-up contacts than the service includes.

### 2.2 Glow Up VIP

Glow Up VIP is a broader single-session service. The one 60-minute session gathers evidence and decisions for three deliverables:

- CV context and positioning;
- LinkedIn context and positioning;
- career development plan groundwork, including interview preparation.

Kagiso does not complete the CV, LinkedIn or plan deliverables live during the 60-minute session. The session gathers the evidence and decisions needed to produce them afterwards.

The 30-day plan should connect those deliverables into one career development direction. The WhatsApp message and the 15-minute Microsoft Teams session are the service follow-through, not extra deliverables or extra live coaching sessions.

### 2.3 Recommended VIP timing

The recommended cadence is:

- WhatsApp progress message around days 10 to 14.
- Microsoft Teams review around days 28 to 30.

This timing is a working recommendation and should be confirmed before the follow-up scheduler is changed. The important product rule is that VIP must not silently continue using the old four-checkpoint schedule.

---

## 3. What the Session Preparation section is for

Session Preparation is a private coach workspace. It is not client-facing and it is not a replacement for Kagiso's judgment.

Its job is to help Kagiso enter the 60-minute session knowing:

- what the session needs to accomplish;
- which conversation stages protect the client outcome;
- which questions are essential and which can be cut;
- what to listen for at the moment it becomes relevant;
- which observations are directly grounded in intake or CV evidence;
- which interpretations are only hypotheses to verify.

It must never generate automatically just because a client is selected or because the page loads. Kagiso explicitly chooses to prepare a session after the prerequisites are ready.

### 3.1 Readiness requirements

Session preparation should use:

- the merged live intake and any saved Kagiso overrides;
- a saved CV analysis report;
- any earlier diagnostic context that has been explicitly included and consented for session preparation;
- the selected service, either Career Clarity or Glow Up VIP.

Missing prerequisites should produce an actionable readiness state, such as returning Kagiso to Client Context or CV Analyzer. The system should not silently generate a thinner preparation while presenting it as complete.

### 3.2 Session Preparation output contract

Every new 60-minute preparation must include:

- a session focus;
- an opening frame;
- an urgency note where relevant;
- four or five timed conversation stages;
- start and end minutes for every stage;
- a stage priority: `protect`, `standard`, or `trim_first`;
- stage-mapped Listen For cues;
- no more than five priority questions;
- two or three `must_ask` questions;
- remaining questions marked `if_time`;
- a clear close with the intended decision, action or commitment;
- grounded coach notes grouped by source;
- judgment calls framed as hypotheses to verify.

The stage timings must start at minute 0, end at minute 60, be contiguous, have no gaps or overlaps, and sum to the full hour.

For Glow Up VIP, each stage must also identify the deliverable it feeds: CV, LinkedIn, plan, or a combination of those.

### 3.3 Session Preparation layout

The preparation view should use two tabs inside the preparation surface:

#### Session Guide — default tab

- Full-width Session Focus header.
- Service, duration and platform badge: for example, `Career Clarity · 60 min · Microsoft Teams`.
- Urgency warning when interviews or other deadlines are already active.
- Timed conversation flow.
- `protect`, `standard` and `trim_first` labels.
- VIP deliverable chips where relevant.
- A collapsed Listen For note attached to each relevant stage.
- Must-ask questions shown prominently.
- If-time questions collapsed by default.
- Close With section.
- Copy, print and export actions.

Listen For must not be one always-expanded session-wide block. These cues are live monitoring aids. A cue about interviews belongs with the recruiter or CV positioning stage; a cue about team-carrying burnout belongs with the performance or pressure stage. Kagiso should be able to glance at the cue without leaving the stage she is running.

#### Coaching Lens

- Grounded Notes grouped by source:
  - Intake.
  - CV analysis.
  - Earlier diagnostic.
- Judgment Calls in an amber hypothesis panel.
- Clear language such as: `Hypothesis — verify with the client.`

The Coaching Lens is for pre-session interpretation. It should not carry moment-to-moment cues that belong in the live Session Guide.

### 3.4 Legacy preparation records

Older preparations may lack timing, question priorities, source classification and stage-mapped cues. They must continue to load safely.

Legacy cues should remain available in a collapsed block labelled:

> General notes for this session

They should not be presented as if they were stage-mapped, but they should not be discarded or framed as requiring regeneration. Regeneration is an optional improvement, not the only way to use valuable existing notes.

Legacy coach notes should be labelled conservatively, for example:

> Legacy coach notes — source not classified.

The normalizer must not reinterpret old free text as new structured evidence.

### 3.5 Preparation export

Kagiso should be able to edit the preparation before exporting it. Export options should include:

- browser print;
- PDF;
- DOCX/document format;
- guide-only export;
- selected private notes where explicitly included.

The export should naturally produce a readable two-page or three-page document depending on content length. It should preserve the editorial hierarchy, readable type size, service metadata, timed stages, question priorities and private-note boundaries.

---

## 4. What Session Debrief is for

Session Debrief is the private bridge between the live conversation and the client plan.

It is not meant to be a one-to-one answer form for every priority question. The five priority questions are live prompts; the debrief is a synthesis of what the conversation produced.

The compact shared debrief schema is intentional:

1. **What shifted in the session** — what became clearer, changed or moved forward.
2. **Commitments made** — what the client and Kagiso each agreed to do.
3. **Tone or sensitivity notes** — confidence, urgency, personal context or anything the follow-up should handle carefully.

Glow Up VIP also has:

4. **Interview story evidence** — supported situation, responsibility, action and outcome details that can inform the embedded interview preparation.

The debrief must remain editable and human-reviewed. A plan cannot be generated from unsaved debrief text.

### 4.1 Must-ask reference

The debrief screen should keep a compact reference to the actual session-prep questions, especially the must-ask questions. Kagiso should not need to leave the debrief screen and rely entirely on memory.

Field guidance should be specific rather than repeating the same generic placeholder:

- What shifted should prompt for direction, decision and client language.
- Commitments should prompt for owner and timing.
- Sensitivity notes should prompt for confidence, urgency and personal context.
- Interview story evidence should prompt for concrete situation, responsibility, action and result, with `[Confirm: ...]` where details are missing.

---

## 5. Session Evidence workflow

Sometimes Kagiso has a transcript, Notepad file, Word document or separate coaching notes. The system should let her use those materials without making the raw source the client-facing output.

### 5.1 Inputs

The private Session Evidence panel should support:

- PDF with readable text;
- DOCX;
- TXT;
- Markdown;
- pasted additional context in a text area.

The panel must support:

- upload;
- preview extracted text;
- save a new evidence revision;
- replace the current file;
- remove the current file from the active revision;
- retain earlier private revisions for audit and provenance.

### 5.2 No automatic AI

Uploading or saving evidence must not automatically call AI. The explicit action is:

> Suggest debrief from evidence

This action should be available only after evidence has been saved and a session preparation exists.

### 5.3 AI suggestion behavior

The AI suggestion process should:

- use the saved evidence and additional context;
- receive the actual priority questions from the latest preparation;
- map useful evidence back to question indexes;
- suggest the three shared debrief fields;
- suggest VIP interview-story evidence only for Glow Up VIP;
- leave unsupported questions blank or mark them as unconfirmed;
- show suggestions in a review panel;
- require Kagiso to apply or discard them;
- never silently overwrite the debrief;
- never send the raw transcript directly into the client plan.

The plan generator should continue to consume the reviewed, saved debrief, together with the saved intake, CV text and CV analysis. Session Evidence is an input to human-reviewed synthesis, not a bypass around it.

### 5.4 Evidence safety

Uploaded files and pasted notes are untrusted data. The system must:

- validate file type using extension, MIME where available and magic bytes;
- enforce a file-size limit;
- support only the intended document types;
- keep raw files in private storage;
- store extracted text separately;
- cap extracted text before it reaches the AI provider;
- label source text as untrusted in the prompt;
- reject instruction-following from inside a transcript or note;
- normalize AI output into known debrief fields only;
- reject unsupported numerical details where mechanically detectable;
- retain evidence and suggestion provenance.

No transcript, private coach note or judgment call may appear in client-facing content unless Kagiso deliberately edits or applies it through the review flow.

### 5.5 Unsaved state

Switching between Session Preparation and Session Debrief must not erase unsaved debrief text. The workspace should preserve the in-progress draft while the client remains selected, and should also retain a client-scoped browser-session draft if the route re-renders during tab navigation.

---

## 6. Career Development Plan

The plan is the client-facing roadmap created after the session. It is not merely a list of follow-up messages and it is not the same as the private debrief.

### 6.1 Shared plan structure

Both services should produce a plan with:

- focus statement;
- intended career outcome;
- direction or role criteria;
- strengths and evidence to build on;
- positioning or development gaps;
- immediate actions;
- longer-term milestones;
- risks and blockers;
- client commitments;
- Kagiso support commitments;
- questions to revisit in follow-up.

The plan should include 30-, 60- and 90-day direction markers where useful, even when the immediate action section is only 14 or 30 days.

### 6.2 Career Clarity plan

The Career Clarity plan should be lean and decision-oriented:

- clarified direction;
- role or offer criteria;
- first 14 days of action;
- evidence or CV positioning to strengthen;
- what to stop, continue or test;
- 30-, 60- and 90-day direction markers;
- the recommended day-14 follow-up agenda.

### 6.3 Glow Up VIP plan

The Glow Up VIP plan should connect:

- career direction;
- CV positioning;
- LinkedIn positioning;
- application or opportunity strategy;
- interview readiness;
- first 30 days of action;
- 30-, 60- and 90-day development markers;
- the embedded interview-prep section;
- the recommended WhatsApp and Microsoft Teams follow-up focus.

### 6.4 Generation and review boundary

Plan generation should use:

- sanitized intake data;
- saved reviewed debrief;
- saved CV analysis where available;
- supported CV text;
- approved service context.

The generated plan must be editable in the existing review UI. It must be approved before delivery. The approved version—not the raw generated version—feeds the delivery path and follow-up record.

Each generated plan should preserve a source snapshot containing the workspace revision, intake version, CV source, CV analysis report and generator metadata.

---

## 7. Follow-up operations

Follow-up is an operational layer attached to the approved plan. It answers:

> What does Kagiso need to do next, when, through which channel, and what should she discuss?

It should not be represented as generic AI-generated checkpoints that continue indefinitely.

### 7.1 Career Clarity follow-up

After the plan is approved and delivered:

- create one pending 15-minute Microsoft Teams follow-up;
- target approximately day 14 after the session or delivery date, according to the final business rule;
- let Kagiso choose the actual date and time;
- record the Microsoft Teams meeting link if available;
- display a recommended agenda generated from the approved plan;
- allow the follow-up to be marked booked, completed, missed or rescheduled;
- capture the outcome privately.

Recommended agenda:

- What action did the client complete?
- What changed after taking action?
- What became blocked or uncertain?
- What is the next commitment?

### 7.2 Glow Up VIP follow-up

After the plan is approved and delivered:

- create one WhatsApp progress-message task;
- create one pending 15-minute Microsoft Teams follow-up;
- recommend the WhatsApp message around days 10 to 14;
- recommend the Microsoft Teams review around days 28 to 30;
- allow Kagiso to edit the WhatsApp message before sending;
- allow Kagiso to choose the Microsoft Teams date and time;
- record the channel, status, date and private outcome.

The WhatsApp message should be generated from the approved plan but must remain editable. It should ask for a concise progress signal, not recreate a full coaching session.

### 7.3 Booking and reminders

The initial implementation should not automatically book a calendar event or send a WhatsApp message without an explicit Kagiso action.

The system should first provide:

- a due date;
- a recommended contact type;
- a suggested message or agenda;
- a Book or Mark as sent action;
- an outcome field.

Calendar integration, automated WhatsApp delivery and reminder automation can be added after the service rules are stable.

### 7.4 Follow-up outcome

The completed follow-up should capture:

- completed, skipped or rescheduled status;
- progress status: on track, partly on track, blocked or complete;
- what changed;
- current blocker;
- decision made;
- next commitment;
- themes such as career direction, CV positioning, interview readiness, role fit or accountability.

Any plan change after follow-up should create a new plan revision. The original approved delivery must remain auditable.

---

## 8. Glow Up VIP embedded interview preparation

Interview preparation is available only for Glow Up VIP. It is a section inside the existing plan JSON and existing plan review/delivery flow.

It is not a separate file, export, endpoint, table or product.

### 8.1 Fixed content specification

The generated section must include exactly these categories:

1. Five to eight likely interview questions specific to the target role or industry.
2. One worked STAR-format example based on the client's own CV history.
3. Three to four story prompts pointing to specific CV or intake experiences.
4. A five-item company and panel research checklist.
5. One watch-out note describing the likely weak point a panel may probe and one concise handling suggestion.

### 8.2 STAR example rules

The STAR example must use only supported client history. It must not fabricate:

- metrics;
- outcomes;
- dates;
- team size;
- company facts;
- panel information;
- responsibilities not present in the sources.

If the evidence is incomplete, the section must be labelled as incomplete and use placeholders such as:

```text
[Confirm: measurable result]
[Confirm: the client's specific responsibility]
```

Kagiso can complete these during plan review.

### 8.3 Research checklist rules

The checklist tells the client what to research. It does not claim that the system has researched the company or panel.

No web research capability is part of this task. Company-specific facts require a separate capability and separate approval.

### 8.4 Scope exclusion

Do not pull the R149 Interview Story Bank Workbook into this feature. The separate product will cover:

- STAR-plus-the-Link;
- eight to ten story types;
- deeper story-bank development;
- premium interview-command content.

The embedded VIP section remains the lightweight, practical version.

---

## 9. Workspace layout and editorial design

The overall Career Tools workspace currently has the client workflow tabs:

- Client Context;
- CV Analyzer;
- Session Preparation;
- Session Debrief + Plan.

The Session Preparation surface itself uses two tabs: Session Guide and Coaching Lens.

The Session Debrief + Plan surface should be renamed or presented as **Session Debrief + Plan**, because “Session Brief” can be confused with pre-session preparation.

### 9.1 Editorial design direction

The design should feel like a calm professional working document rather than a dense admin form:

- use the warm-neutral brand palette;
- use Dark Gunmetal `#142334` for major working surfaces and the General Notes legacy block;
- use warm white and chai-neutral backgrounds for content cards;
- use a readable serif display face for major section titles;
- increase body text size and line height where current notes feel cramped;
- use wide content containers and full-width focus copy;
- use restrained uppercase labels for metadata only;
- use amber only for urgency or hypothesis framing;
- avoid making every section a boxed card;
- keep interactive controls visually obvious;
- preserve print readability.

### 9.2 Session Guide hierarchy

```text
SESSION FOCUS
Service · duration · Microsoft Teams · urgency warning · Copy all

[ Session Guide ] [ Coaching Lens ]

Session Guide
  Timed flow
    Stage 1 · time · priority · deliverables
      collapsed Listen For
    Stage 2 · time · priority · deliverables
      collapsed Listen For
  Must-ask questions
  If-time questions, collapsed
  Close With

Coaching Lens
  Grounded Notes by source
  Judgment Calls
    Hypothesis — verify with client
```

### 9.3 Debrief and plan hierarchy

```text
SESSION DEBRIEF
  Session Evidence
    Upload / paste / preview / replace / remove
    Must-ask reference
    Suggest debrief from evidence
    Review and apply suggestions
  Reviewed debrief
    What shifted
    Commitments made
    Sensitivity notes
    VIP interview story evidence
  Career Development Plan
    Generate
    Edit
    Review
    Approve
  Follow-up
    Message / call task
    Recommended agenda
    Book / complete / outcome
```

Session Evidence should be full-width above the debrief and plan. The plan and debrief may sit in a two-column layout on large screens, but the evidence panel should not be forced into a narrow column because it contains transcript context and review controls.

---

## 10. Data and provenance model

The system should keep these sources distinct:

| Source | Meaning | Client-facing by default? |
|---|---|---|
| Intake | What the client submitted before the session | No, sanitized excerpts only |
| CV source | The client's uploaded or linked CV | No, used as evidence |
| CV analysis | Structured interpretation of CV evidence | No, used as working input |
| Session preparation | Kagiso's private pre-session guide | No |
| Session evidence | Private transcript, notes and added context | No |
| Reviewed debrief | Kagiso-approved synthesis of the session | No, feeds generation |
| Career development plan | Approved client deliverable | Yes |
| Follow-up outcome | Private post-contact record | No, unless deliberately adapted |

### 10.1 Versioning

The following should be append-only or revisioned:

- session preparations;
- session evidence;
- AI evidence suggestions;
- debrief workspace revisions;
- CV analysis reports;
- generated plans;
- edited plan drafts;
- approved plan delivery records;
- follow-up outcomes.

Regeneration must not mutate a prior preparation or plan. A new version must preserve its input snapshot and generator metadata.

### 10.2 Private data boundary

All dashboard endpoints require the existing diagnostic admin authorization. Raw files and extracted notes remain private. The client delivery path should use approved plan content only.

No private judgment call, raw transcript, unclassified legacy note or unsupported AI interpretation should be sent to a client accidentally.

---

## 11. Current implementation status

### Already implemented or represented in the current code

- Career Tools client workspace and service-aware access rules.
- Client Context, CV Analyzer, Session Preparation and Session Debrief + Plan workflow.
- Timed session preparation normalization for 60-minute sessions.
- Stage priority and question priority normalization.
- VIP deliverable coverage validation.
- Grounded notes and judgment-call separation in session preparation.
- Stage-mapped Listen For rendering and legacy general-note handling.
- Editorial session preparation exports to print/PDF/DOCX.
- Full-width Session Focus treatment and readable typography improvements.
- Textarea scroll chaining fix.
- Three-field service-aware debrief with VIP interview story evidence.
- Editable plan generation and approval flow.
- Embedded VIP interview-prep content contract and plan review editor.
- No client-facing interview-prep output for Career Clarity.
- Private Session Evidence API and UI code, including file validation, extraction, preview, revisions and explicit suggestion action.
- Client-scoped preservation of unsaved debrief text across workspace tab changes.

### Current implementation mismatch to resolve

The existing follow-up code still models:

- Career Clarity: day 7 and day 14 checkpoints.
- Glow Up VIP: day 7, day 14, day 21 and day 30 checkpoints.

That model should be replaced by the service promises in this document:

- Career Clarity: one 15-minute Microsoft Teams follow-up around day 14.
- Glow Up VIP: one WhatsApp message plus one 15-minute Microsoft Teams follow-up.

The old follow-up model should not be layered on top of the new one.

### Activation blocker

The Session Evidence database migration exists in the repository, but the linked Supabase project previously returned `401 Unauthorized` during migration-state verification. The feature is coded defensively so the existing debrief and plan remain usable when the evidence tables are not yet active.

Before live acceptance:

1. Re-authenticate the Supabase CLI or otherwise restore linked-project authorization.
2. Apply pending migrations.
3. Verify the new private evidence and suggestion tables.
4. Create or select a suitable test Career Clarity and Glow Up VIP record.
5. Browser-test upload, extraction, review, apply, save, plan generation and follow-up rendering.

---

## 12. Implementation phases

### Phase 1: Establish the approved content model

- Rename the conceptual output to Career Development Plan.
- Define the shared plan fields and service-specific sections.
- Confirm the exact VIP contact timing.
- Confirm that Microsoft Teams is the platform for both follow-up calls.
- Update service definitions and public copy only after the promises are final.

### Phase 2: Replace the follow-up model

- Replace generic checkpoint schedules with service-specific follow-up tasks.
- Add channel, due window, duration, scheduled date and status.
- Add recommended agenda/message generated from the approved plan.
- Preserve explicit Kagiso control over booking and sending.
- Add private outcome capture and plan-revision linkage.

### Phase 3: Activate and verify Session Evidence

- Apply the private evidence migration.
- Upload a TXT, DOCX and text PDF test fixture.
- Confirm extracted preview and stored revision behavior.
- Confirm remove-current-file behavior preserves prior history.
- Confirm AI is not called on upload.
- Confirm suggestions map only to actual preparation questions.
- Confirm apply requires review and the plan still reads the saved debrief.

### Phase 4: Verify the embedded VIP interview prep

- Generate a Glow Up VIP plan with complete STAR evidence.
- Generate one with missing outcome details and verify `[Confirm: ...]` placeholders.
- Verify five to eight questions, three to four story prompts and exactly five research items.
- Verify Career Clarity never receives the interview-prep section.
- Edit the section in plan review and confirm the edited version reaches approved delivery.

### Phase 5: Clean up product language and exports

- Replace “follow-up plan” where it creates confusion with “Career Development Plan.”
- Label the service contact separately as Follow-up.
- Make the exported client document show the plan first and the follow-up commitment clearly but briefly.
- Keep private notes out of client exports unless explicitly selected for a coach-only export.

---

## 13. Acceptance criteria

### Session Preparation

- [ ] New generated records display timing and question priorities, not only store them.
- [ ] Timings start at 0, end at 60 and have no gaps or overlaps.
- [ ] Career Clarity has four or five stages and no more than five questions.
- [ ] Career Clarity has two or three must-ask questions.
- [ ] VIP stages identify CV, LinkedIn and plan coverage.
- [ ] Listen For cues are collapsed and stage-mapped.
- [ ] Legacy notes remain visible as unmapped General Notes.
- [ ] Coaching Lens contains grounded notes and hypotheses, not live cue overload.

### Session Evidence and Debrief

- [ ] Upload accepts PDF, DOCX, TXT and Markdown within the size limit.
- [ ] File contents are validated before storage.
- [ ] Extracted text is stored separately from the raw file.
- [ ] Additional context can be pasted and saved.
- [ ] Upload does not invoke AI.
- [ ] Suggestion generation is explicit.
- [ ] Suggestions show question-level mapping and require review.
- [ ] Career Clarity cannot receive VIP interview-story suggestions.
- [ ] Unsaved debrief text survives switching tabs.
- [ ] The plan cannot generate from unsaved debrief changes.

### Career Development Plan

- [ ] Plan generation uses the saved reviewed debrief.
- [ ] Plan generation includes intake and CV analysis where available.
- [ ] Plan is editable before approval.
- [ ] Approved content is distinct from generated content.
- [ ] Career Clarity includes a first-14-days section.
- [ ] Both services include career development direction and longer-term markers.

### Follow-up

- [ ] Career Clarity creates one 15-minute Microsoft Teams follow-up.
- [ ] Career Clarity follow-up is targeted around day 14.
- [ ] Glow Up VIP creates one WhatsApp message task.
- [ ] Glow Up VIP creates one 15-minute Microsoft Teams follow-up.
- [ ] Kagiso chooses the actual booking date.
- [ ] Suggested agenda/message is generated from the approved plan.
- [ ] Kagiso can edit before sending or booking.
- [ ] Follow-up outcome is recorded privately.
- [ ] Plan revisions preserve the original approved delivery.

### Interview preparation

- [ ] Generated only for Glow Up VIP.
- [ ] Embedded inside the existing plan JSON.
- [ ] Five to eight role-specific questions.
- [ ] One supported STAR example.
- [ ] Three to four story prompts.
- [ ] Exactly five research checklist items.
- [ ] One weak-point note and handling line.
- [ ] Missing details receive `[Confirm: ...]` placeholders.
- [ ] No company or panel web research is performed.
- [ ] R149 workbook scope is excluded.

---

## 14. Decisions still requiring confirmation

The following are the only material product decisions still open in this document:

1. Confirm the exact VIP timing for the WhatsApp message and Microsoft Teams call. The recommended cadence is days 10 to 14, then days 28 to 30.
2. Confirm whether the Career Clarity day-14 follow-up date is measured from the live session date or the approved plan delivery date.
3. Confirm whether follow-up booking should remain manual in the first release or connect to the existing calendar flow.
4. Confirm whether the client-facing plan should include a brief “Your follow-up” section or whether booking details should remain only in Kagiso's dashboard.

Everything else in this document is treated as the agreed direction unless a later decision explicitly supersedes it.

---

## 15. Explicit exclusions

- No live interview session is added to Glow Up VIP.
- No separate interview-prep endpoint, table or export is created.
- No R149 Interview Story Bank Workbook content is pulled into this feature.
- No automatic company or panel web research is added.
- No full STAR-plus-the-Link methodology is added.
- No automatic WhatsApp sending is added without explicit approval.
- No automatic calendar booking is added without explicit approval.
- No marketing or insights content changes are included until service promises are confirmed.
- No changes to `lib/buying-flow.ts` or `lib/email-templates.ts` are made unless an actual mismatch is found during implementation.

---

## Final product principle

The system should help Kagiso do three things well:

1. Enter the session prepared without carrying every cue in her head.
2. Capture and review what actually happened without losing the important evidence.
3. Deliver a clear career development plan and complete the exact follow-up promise attached to the service.

If a feature does not strengthen one of those three outcomes, it should not be added to this workflow by default.
