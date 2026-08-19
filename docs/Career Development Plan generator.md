**Prompt for the build LLM: Career Development Plan generator**

Context: the plan output for both services is now called a **career development plan**, matching the artifact Kagiso already gives clients. This replaces "written action plan" and "personalized support plan" as the name in the system and in the delivered document. Sales cards will be updated to match separately.

**Task 1 — Plan horizon and structure**

The plan horizon is **30 days, scaling to 60 or 90 days for more complex goals**, for both services. This is the shipped, current public commitment. Do not build Career Clarity as a 14-day plan.

Structure within that horizon:
- Career Clarity: career development plan with a **"First 14 Days"** subsection
- Glow Up VIP: career development plan with a **"First 30 Days"** subsection

Those subsections are keyed to when the follow-up contact happens. They are not the plan's total scope. The plan still runs to 30, 60 or 90 days in both cases.

**Task 2 — Five additions to the generated plan**

Each is small and sits inside the existing plan structure. Do not build tracking infrastructure, weekly logging, or quarterly review systems for any of these; the plan is a static document the client keeps.

1. **Opening diagnostic paragraph.** One paragraph the client can react to, structured as: what they value, what they are demonstrably good at, where the gap is. Generated from the reviewed session debrief plus intake plus CV analysis. This is client-facing, so it must stay free of unverified hypotheses (those remain in private coach notes, per the existing grounded/judgment-calls split in session preparation).

2. **30/60/90 milestones.** 2-3 concrete actions per horizon. Where a plan is scoped to 30 days only, generate the 30-day set and omit the rest rather than padding.

3. **Minimum Viable Commitment.** One line: a single recurring weekly action the client commits to regardless of how the rest of the plan is going. Must be specific and small enough to survive a bad week (e.g. "one outreach message every Monday"). One per plan, not a list.

4. **Checkpoint condition.** One sentence tying a specific, checkable condition to the scheduled follow-up: "If [specific thing] has not happened by [date], that is information, not failure, and we revisit it at your follow-up." Must reference the actual follow-up date for that engagement, not a generic placeholder.

5. **Permission line.** One sentence near the top of the plan establishing that it is a tool rather than a scorecard, and that returning to it after a missed week counts as progress. Fixed intent, wording can vary by client context.

**Task 3 — Follow-up commitments**

Replace the current checkpoint schedules (Clarity days 7 and 14; VIP days 7, 14, 21, 30) with actual service commitments:

- Career Clarity: one 15-minute Microsoft Teams call, guideline window around day 14
- Glow Up VIP: one WhatsApp check-in, guideline window days 10-14, plus one 15-minute Microsoft Teams call, guideline window days 28-30

These windows are suggested defaults, not fixed dates. The actual date is agreed between Kagiso and the client, and may fall earlier or later. The UI should present them as adjustable guidance rather than a locked schedule, and the plan's checkpoint condition (Task 2, item 4) should reference the agreed date once set, falling back to the guideline window where no date has been confirmed yet.

All live and scheduled contact is Microsoft Teams. Any Zoom reference in follow-up code, templates or copy is stale and should be corrected wherever it appears.

Keep the follow-up record minimal: due date, status (done / not done), and a notes field. Do not build the full tracker (five status states, channel, recommended focus, outcome, next commitment) unless it is separately requested. This build has been scoped around Kagiso's time constraints throughout.

**Constraints carried forward from earlier tasks**

- No fabrication. Where sources cannot support a specific claim, metric or milestone, use `[Confirm: ...]` placeholders rather than inventing detail.
- Every generated section editable in the existing plan review before approval.
- Approved plans revise, never silently overwrite.
- Legacy-safe normalization: existing plan records without these new fields must still load and render.
- Generator draws on the reviewed session debrief, supported by intake and CV analysis. Raw transcripts do not flow into client-facing content unreviewed.
- VIP interview prep stays lightweight and inside the plan, unchanged from its existing contract.

**Explicit exclusions**

- No weekly scoreboard, evidence log, or accountability-tracking system
- No quarterly objectives or 3-year horizon framing
- No labour-market research, live job-posting analysis, or compensation data
- No identity or narrative story work in the general plan (this already exists in VIP interview prep and must not be duplicated)
- No readiness screening or financial-runway gating (see below)
- No sales or marketing copy changes in this task

---

**Deliberately excluded, pending Kagiso**

The readiness check ("are you ready to change, or still exploring") and the runway stop-rule (refusing to build a plan when a client cannot give financial numbers) are both genuinely valuable and cheap to add, but both change how she runs a session and what she can decline to deliver. Those are her decisions, not build decisions. Left out so the build is not blocked; easy to add later as they are single fields.

**Needs a decision before this ships**

VIP follow-up timing was never settled. You decided WhatsApp around day 7-10 and the live call around day 21. The build LLM proposed day 10-14 and day 28-30. I argued for holding at day 21, since a live call at day 28-30 leaves no support runway behind whatever comes out of it. Pick one before Task 3 gets built, or it will be built on a guess.