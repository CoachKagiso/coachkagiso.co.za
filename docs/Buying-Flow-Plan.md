# Buying Flow Plan

**A complete operational specification for how every service is bought on coachkagiso.co.za. Single source of truth for the AI builder. Each service maps to a specific set of tools, intake questions, pages, and email triggers. Built so the buyer's journey from "I want this" to "Kagiso has everything she needs" is two clicks for async services and one for session-based services.**

Version 1.1 · May 2026 · Companion to the Service Architecture v1.1 and the Work With Me Page Copy

**v1.1 update:** Tally removed from the stack. All intake forms are now built natively in Next.js with submissions saved to Supabase. Brand consistency, single backend, full data ownership. New section on payment validation added.

---

## The mental model — three things must happen

Every purchase on the site requires some combination of three actions:

1. **Payment** — money moves from buyer to Kagiso
2. **Intake** — Kagiso receives the information she needs to deliver
3. **Booking** — a specific time gets reserved on Kagiso's calendar (only for session-based services)

Different services need different combinations. The architecture splits services into two types, each with its own optimised flow.

---

## The two service types

### Type A — Async services (no calendar needed)

Kagiso delivers when she's ready, within a promised turnaround. The buyer doesn't need to pick a time. Five services fall here.

| Service | Price | Turnaround | Pillar |
|---|---|---|---|
| 48-Hour CV Review | R150 | 48 hours | 3 |
| CV Revamp | R400 | 5 working days | 3 |
| Cover Letter | R150 | 5 working days | 3 |
| LinkedIn Optimisation | R300 | 5 working days | 3 |
| CV + LinkedIn Bundle | R500 | 7 working days | 3 |

**Flow:** Buyer pays → lands on a native intake form on the thank-you page → submits. Two actions.

**Tools:** PayFast (payment) → Next.js thank-you page with native form → Supabase (data and file storage) → Brevo (confirmation email) → Slack via webhook (notification to Kagiso).

### Type B — Session-based services (calendar needed)

Buyer picks a time, pays, and shows up. Three services fall here.

| Service | Price | Format | Pillar |
|---|---|---|---|
| Career Clarity Session | R800 | 75-min 1-on-1 + 14-day follow-up | 1 |
| Glow Up VIP Package | R1,200 | Multi-session over 30 days | 1, 3 |
| Saturday Masterclass | R450 / R500 | 2-hour group, fortnightly | All |

**Flow:** Buyer picks a slot, fills intake questions, pays, all in one flow. One action.

**Tools:** cal.com (booking + intake + payment via Stripe) → Brevo (confirmation and follow-up sequence) → Supabase (mirrored intake data for unified backend).

---

## The full tool stack

| Tool | Job | Cost |
|---|---|---|
| **Next.js (Vercel)** | Service pages, thank-you pages, native intake forms, payment validation | Free hosting on Vercel |
| **Supabase** | Form submission storage, file uploads (CV documents), payment validation table, webhook triggers | Free tier covers launch volume |
| **PayFast** | Payments for Type A services. SA-native, supports cards, EFT, PayShap, PayJustNow instalments | 3.5% + R2 per transaction |
| **Stripe South Africa** | Payments for Type B services via cal.com integration | 2.9% + R2 per transaction |
| **cal.com** | Booking, intake, and payment for Type B services | Free for one user; €12/month for paid features |
| **Brevo** | Email confirmations, automated sequences, contact management | Free up to 300 emails/day |
| **Slack (or email)** | Notifications to Kagiso when intake forms are submitted or sessions booked | Free |

**Total monthly cost at launch:** roughly R250 (cal.com paid plan if needed; everything else free at the volume Kagiso will start at).

**Per-transaction cost:** roughly 3-4% of revenue across both payment processors. Standard for South African coaching practice pricing.

---

## URL structure

All buyer journeys flow through clean, predictable URLs. The AI builder should implement these routes.

| URL | What lives here |
|---|---|
| `/work-with-me` | Services listing page |
| `/buy/cv-review` | Service summary + PayFast checkout button |
| `/buy/cv-revamp` | Service summary + PayFast checkout button |
| `/buy/cover-letter` | Service summary + PayFast checkout button |
| `/buy/linkedin` | Service summary + PayFast checkout button |
| `/buy/bundle` | Service summary + PayFast checkout button |
| `/book/clarity` | cal.com booking embed for Career Clarity |
| `/book/glow-up` | cal.com booking embed for Glow Up VIP |
| `/book/masterclass` | cal.com booking embed for Saturday Masterclass |
| `/thanks/cv-review?payment_id=XXX` | Native intake form for CV Review |
| `/thanks/cv-revamp?payment_id=XXX` | Native intake form for CV Revamp |
| `/thanks/cover-letter?payment_id=XXX` | Native intake form for Cover Letter |
| `/thanks/linkedin?payment_id=XXX` | Native intake form for LinkedIn |
| `/thanks/bundle?payment_id=XXX` | Native intake form for Bundle |
| `/thanks/booked` | Generic thank-you page after cal.com booking (Type B) |

The `/buy/[service]` pages contain a service summary and the PayFast checkout button. The `/thanks/[service]` pages host the native form, gated by a payment validation check.

---

## Payment validation — the security layer

This is the one piece native forms need that a third-party tool like Tally would have abstracted away. Worth specifying clearly.

**The problem:** if the thank-you page URL is just `/thanks/cv-revamp`, anyone with the URL could fill out the form without paying.

**The solution:** payment validation on every form load.

**The flow:**

1. Buyer clicks "Book my CV Revamp" and lands on `/buy/cv-revamp`
2. Buyer clicks the PayFast button. PayFast checkout opens with R400 prefilled.
3. On successful payment, PayFast does two things in parallel:
   - Sends a server-to-server webhook (called ITN, "Instant Transaction Notification") to a Supabase Edge Function. The Edge Function writes a row to the `payments` table with the unique `payment_id`, status `confirmed`, and the service name.
   - Redirects the buyer's browser to `/thanks/cv-revamp?payment_id=XXX`.
4. The thank-you page reads the `payment_id` from the URL and queries the Supabase `payments` table to confirm:
   - The payment exists
   - The status is `confirmed`
   - The service matches the URL
   - The payment is recent (within the last 30 minutes — prevents URL reuse)
5. If valid, render the form. If invalid, show an error: *"We couldn't verify your payment. If you've just paid, give it 30 seconds and refresh. If not, please complete payment first or WhatsApp Kagiso."*

**The Supabase tables this needs:**

```
payments
  - id (uuid)
  - payment_id (text, from PayFast)
  - service_slug (text — e.g., "cv-revamp")
  - amount (numeric)
  - status (text — pending/confirmed/failed)
  - buyer_email (text)
  - created_at (timestamp)
  - intake_submitted_at (timestamp, nullable)

intake_submissions
  - id (uuid)
  - payment_id (text — foreign key to payments)
  - service_slug (text)
  - form_data (jsonb)
  - file_uploads (text[] — Supabase Storage paths)
  - submitted_at (timestamp)
```

**The Supabase Storage bucket:**

```
client-uploads/
  /cv-revamp/[payment_id]/[filename]
  /cv-review/[payment_id]/[filename]
  /bundle/[payment_id]/[filename]
  ...
```

Files are accessible only via signed URLs generated by Kagiso's admin tools or by the Slack notification.

This is standard Next.js + Supabase pattern. Cursor or Claude Code can build the full validation layer in one prompt.

---

## Per-service detailed flow

Each service section below is a complete spec for the AI builder. Copy is paste-ready in Kagiso's voice.

---

### 1. 48-Hour CV Review — R150

**Type:** Async
**Pillar:** Personal Branding

**Buyer journey:**
1. Clicks "Get my CV reviewed" on `/work-with-me`
2. Lands on `/buy/cv-review` (service summary + PayFast button)
3. Clicks pay, completes PayFast checkout
4. Redirects to `/thanks/cv-review?payment_id=XXX`
5. Page validates payment via Supabase, renders the native intake form
6. Buyer fills form, uploads CV, clicks Submit
7. Form data saves to `intake_submissions` table; CV uploads to Supabase Storage
8. Brevo sends confirmation email; Slack notifies Kagiso
9. `payments.intake_submitted_at` is updated so the 24-hour reminder doesn't fire

**Native form fields:**
- Your full name (text input, required)
- Email (email input, required)
- WhatsApp number (text input, optional, with helper text: "for quick clarifying questions")
- Upload your current CV (file input, accepts PDF and Word, max 10MB, required)
- What role or roles are you currently applying for? (textarea, required)
- What's the one thing you most want me to look at? (textarea, required)

**Thank-you page copy (above the form):**

> # Got it. Now I need 5 minutes of your time.
>
> I've received your payment for the 48-Hour CV Review. To make this useful, I need to see your current CV and know what you're trying to do with it.
>
> Fill in the form below. As soon as I have your CV, I'll start reviewing. Your 5-minute Loom video will be in your inbox within 48 hours.

**Form submission success message:**

> # Thanks. I've got everything.
>
> Your review is in the queue. You'll receive your Loom video within 48 hours, sent to [their email].
>
> If you don't see it by [date + 48 hours], check your spam folder, then WhatsApp me on [number].

**Email confirmation (sent automatically when form is submitted):**

Subject: *Your CV Review is in motion*

Body:
> Hi [first name],
>
> Got your CV. I'll record your review and have it back to you within 48 hours.
>
> When the Loom video lands in your inbox, watch it once through, then watch it again with your CV open and make the changes as I call them out. Most people find that takes about 30 minutes.
>
> If you want a full rewrite after the review, the CV Revamp at R400 picks up where the review leaves off, with R150 credit applied since you've already paid for the review.
>
> Talk soon,
> Kagiso

**Notification to Kagiso (via Supabase webhook → Slack):**
- Slack message: *"New CV Review submission — [name], [email]. Delivery due [date + 48 hours]. CV: [signed URL to download]. Form data: [link to admin view]."*
- Email backup with same content for redundancy

---

### 2. CV Revamp — R400

**Type:** Async
**Pillar:** Personal Branding

**Buyer journey:** Identical structure to CV Review, with PayFast PayJustNow instalment option enabled (2x R200).

**Native form fields:**
- Your full name (text input, required)
- Email (email input, required)
- WhatsApp number (text input, optional)
- Upload your current CV (file input, PDF or Word, max 10MB, required)
- Upload supporting documents (file input, multi-file, optional, helper text: "performance reviews, qualifications, role descriptions you want included")
- What role or industry are you targeting? (textarea, required)
- What's your career story in two sentences? (textarea, required, character counter shows 280 max)
- What's the deadline you're working with? (date picker, optional)
- Anything else I should know? (textarea, optional)

**Thank-you page copy:**

> # Got it. Let's build your CV.
>
> I've received your payment for the CV Revamp. Now I need to understand who you are and where you're going so the rewrite reads like your story, not a template.
>
> Fill in the form below. The more detail you give me, the sharper the result. Your new CV will be back within 5 working days, in Word and PDF, with a 10-minute Loom video walking you through every change.

**Form submission success message:**

> # Thanks. I've got everything I need.
>
> Your CV Revamp is in the queue. Expect your new CV within 5 working days, sent to [their email]. The Loom walkthrough comes with it.
>
> Questions in the meantime? WhatsApp me on [number].

**Email confirmation:**

Subject: *Your CV Revamp is in motion*

Body:
> Hi [first name],
>
> Got your details. I'll start your rewrite this week and have your new CV back within 5 working days. You'll get the Word file, the PDF, and a 10-minute Loom video where I walk you through every change so you understand the thinking.
>
> One small ask: if you receive any feedback on your old CV from a recruiter, employer, or trusted friend in the next few days, forward it to me. It always helps.
>
> Talk soon,
> Kagiso

**Notification to Kagiso:**
- Slack message with all form data, signed URLs to all file uploads, and 5-day delivery deadline

---

### 3. Cover Letter — R150

**Type:** Async
**Pillar:** Personal Branding

**Native form fields:**
- Your full name (text input, required)
- Email (email input, required)
- Upload your current CV (file input, required, helper: "so I can match the voice")
- Paste the full job description (textarea, required, character counter)
- What's the company name? (text input, required)
- Why do you want this specific role? Two sentences. (textarea, required)
- What's the application deadline? (date picker, required)

**Thank-you page copy:**

> # Got it. One cover letter, coming up.
>
> I've received your payment. To write you a cover letter that lands, I need to see the role you're applying for and understand why you want it.
>
> Fill in the form below. Your tailored cover letter will be back within 5 working days.

**Email confirmation:** Standard structure, 5-day turnaround commitment, in Kagiso's voice.

---

### 4. LinkedIn Optimisation — R300

**Type:** Async
**Pillar:** Personal Branding

**Native form fields:**
- Your full name (text input, required)
- Email (email input, required)
- Your LinkedIn profile URL (URL input with validation, required)
- What roles or industries do you want recruiters to find you for? (textarea, required)
- What's the one part of your LinkedIn that frustrates you most right now? (textarea, required)
- Are you currently job hunting, or building visibility for the long game? (radio buttons: "Job hunting now" / "Building for the long game" / "Both")

**Thank-you page copy:**

> # Got it. Let's make your LinkedIn work for you.
>
> I've received your payment for LinkedIn Optimisation. Send me your current profile and tell me what you want it to do, and I'll rebuild the parts that aren't pulling their weight.
>
> Fill in the form below. Your optimised profile copy will be back within 5 working days, ready to paste into LinkedIn.

**Email confirmation:** Standard, 5-day turnaround.

---

### 5. CV + LinkedIn Bundle — R500

**Type:** Async
**Pillar:** Personal Branding

**Native form fields:** All CV Revamp fields + all LinkedIn Optimisation fields, on one form. Use a multi-step pattern (Step 1 of 2: Your CV → Step 2 of 2: Your LinkedIn) to keep it from feeling overwhelming.

**Thank-you page copy:**

> # Got it. Your full toolkit, on the way.
>
> I've received your payment for the CV + LinkedIn Bundle. Now I need both your current CV and your LinkedIn profile so I can build them together with consistent messaging.
>
> Fill in the form below. Both deliverables come back within 7 working days.

**Email confirmation:** Standard, 7-day turnaround. Note that both deliverables come together, not separately.

---

### 6. Career Clarity Session — R800

**Type:** Session
**Pillar:** Career Growth

**Buyer journey:**
1. Clicks "Book my Clarity Session" on `/work-with-me`
2. Lands on cal.com booking page at `/book/clarity`
3. Picks a time slot (75-min sessions, weekday evenings 17:30-19:00, Saturdays 09:00-12:00)
4. Fills intake questions on same page (cal.com handles this natively)
5. Pays via Stripe (R800)
6. Receives cal.com confirmation + Zoom link
7. cal.com webhook to Supabase mirrors the booking + intake data into the unified backend
8. Brevo automation triggers welcome sequence

**Intake questions (cal.com — these are the questions cal.com handles natively):**
- Your full name
- Phone number (for Zoom backup)
- Upload your current CV (so I can come prepared)
- What's your current role and how long have you been in it?
- What's the one thing you most want clarity on?
- What have you already tried that hasn't worked?
- On a scale of 1-5, how stuck do you feel right now?
- Anything else I should know?

**Email confirmation (sent automatically by cal.com):**

Subject: *Your Career Clarity Session is booked — [date]*

Body:
> Hi [first name],
>
> Your session is locked in for [date and time]. Your Zoom link is at the bottom of this email.
>
> A few things to come ready with:
>
> 1. Your CV in front of you (you've already uploaded it, but have it open)
> 2. A clear sense of the one decision or direction you want to walk away with
> 3. A notebook or a Google Doc open for the action plan
>
> The session is 75 minutes. We'll spend the first 10 minutes on where you are, the next 40 on what's next, and the final 25 on a written plan you'll leave with. I'll send the plan to you within 24 hours of the session, and we'll connect again 14 days later for a 15-minute check-in to see what's moved.
>
> If something comes up before the session, you can reschedule once via the link in this email up to 24 hours before.
>
> Looking forward to it,
> Kagiso

**14-day follow-up automation (Brevo):**
- Day 1 after session: Action plan PDF delivered
- Day 7: *"How's it going? Quick reply or skip — no pressure."*
- Day 13: *"Your follow-up call is tomorrow. Book a slot here: [cal.com link for 15-min follow-up]."*
- Day 28: *"It's been two weeks since your follow-up. If anything else comes up, here's what's worked for past clients in your situation: [link to relevant Insights article]."*

---

### 7. Glow Up VIP Package — R1,200

**Type:** Session (multi-session)
**Pillar:** Career Growth + Personal Branding

**Buyer journey:**
1. Clicks "Book my Glow Up" on `/work-with-me`
2. Lands on cal.com booking page at `/book/glow-up`
3. Books the kick-off session (60 min)
4. Fills extended intake questions on cal.com
5. Pays via Stripe (R1,200, with optional split via Stripe instalments)
6. cal.com webhook to Supabase mirrors all data
7. Receives kick-off confirmation + 30-day support window starts on session date

**Intake questions (cal.com):**
Combination of Career Clarity + CV + LinkedIn questions, plus:
- What kind of role or industry are you trying to break into?
- What's your interview history in the last 6 months? (Number of applications, interviews, offers.)
- What's the timeline for your career change? (Days, weeks, months.)
- What scares you most about this transition?

**Email confirmation:**

Subject: *Your Glow Up is in motion — kick-off booked for [date]*

Body:
> Hi [first name],
>
> Your Glow Up VIP is booked. Here's how the next 30 days work:
>
> Today: I've received your CV, LinkedIn, and intake answers. I'll review them before our kick-off.
>
> [Date]: Our 60-minute kick-off session. We'll set the strategy, agree the priorities, and decide which part to tackle first.
>
> Within 7 days of kick-off: Your CV revamped, your LinkedIn optimised. You'll get both back together so the messaging stays aligned.
>
> Within 14 days of kick-off: Your interview prep session — 60 minutes on positioning, common questions, and how to handle the trickier moments.
>
> Days 15-30: Two scheduled 15-min check-ins, weekdays 9-5. You can use these for quick questions, role feedback, or interview reflections. The check-in slots will appear in this email thread closer to the time.
>
> Talk soon,
> Kagiso

**30-day automation (Brevo):**
- Day 0 (booking): Welcome email above
- Day 1 (kick-off session): Reminder + Zoom link 24 hours before
- Day 7: Check-in email after CV/LinkedIn delivery
- Day 14: Interview prep session reminder
- Day 21: First scheduled support check-in
- Day 28: Second scheduled support check-in
- Day 31: *"Your 30-day VIP support has wrapped. Here's what we've covered, and here's where it makes sense to go next."*

---

### 8. Saturday Masterclass — R450 / R500

**Type:** Session (group)
**Pillar:** All

**Buyer journey:**
1. Clicks "Hold my spot" on `/work-with-me` (or hits `/masterclass` directly from ad/social)
2. Lands on cal.com event page at `/book/masterclass`
3. Sees upcoming session dates with seat counts
4. Picks a session
5. Fills intake form (5 questions from the playbook's intake design)
6. Pays via Stripe (R450 if before Sunday 21:00 the week prior, R500 after)
7. Receives confirmation + Saturday Crew WhatsApp invite

**Intake questions (cal.com — these are the 5 questions from Part 5 of the playbook):**
- What is your current career situation? (e.g. employed but stuck, job seeking, recently retrenched, wanting to change industries)
- What is the ONE biggest challenge you are facing in your career right now?
- What would you love to walk away from this session knowing or being able to do?
- Is there anything specific you are hoping I address during the session?
- How long have you been in this situation?
- ☐ I agree to receive career tips, masterclass updates, and follow-up resources from Kagiso. (Required to register, per POPIA.)

**Email confirmation:**

Subject: *You're in for [session date] — Saturday Masterclass*

Body:
> Hi [first name],
>
> You're confirmed for the Saturday Masterclass on [date], 10:00 to 12:00 SAST. Your Zoom link will arrive 24 hours before the session.
>
> Two things to expect:
>
> First, on Thursday I'll send you a short note with the session topic, the workbook to fill in beforehand, and a few of the questions other attendees raised in their intake forms. You'll come in knowing what we're working with.
>
> Second, on Saturday morning at 09:30 you'll get one final email with the Zoom link and a reminder to grab water and a notebook. The session is exactly 2 hours, with a 5-minute bio break at the midpoint.
>
> If you can't make it, you can transfer to a future Saturday at no charge — let me know at least 24 hours before.
>
> See you Saturday,
> Kagiso

**Pre-session and post-session automation (Brevo):**

Per the playbook's Part 8 — The Take-Home Pack:
- Thursday before session: workbook + topic preview
- Saturday morning 09:30: Zoom link + reminder
- Within 2 hours of session ending: Welcome Pack email (4 PDFs + Day-0 voice note)
- Day 1-7: Daily 60-second voice notes via WhatsApp Business broadcast
- Day 3 email: *"Your R100 bonus expires tomorrow"*
- Day 7 email: *"Send me your small win"*
- Day 14 email: *"Saturday after next..."* — bridge to next masterclass

---

## Edge cases and error handling

Every buying flow needs to handle the moments when things go sideways. The AI builder must implement these.

**Payment fails (PayFast or Stripe):**
- Buyer is redirected to `/buy/[service]/failed` with copy: *"Payment didn't go through. This is usually a card or bank issue, not your fault. Try a different card or use the EFT/PayShap option. If it keeps failing, WhatsApp me and I'll send a manual invoice."*
- No notification to Kagiso (failed payments are noise)

**Buyer pays but doesn't fill intake form:**
- Supabase scheduled function runs every hour. It checks the `payments` table for rows where `status = 'confirmed'` and `intake_submitted_at` is null and `created_at` is more than 24 hours ago.
- For each match, trigger a Brevo email: *"Hi [name], you paid for [service] but I haven't received your intake form. Click here to complete it: [link with payment_id token]."*
- 72 hours after payment with no intake: notify Kagiso to follow up personally via WhatsApp

**Buyer loses the thank-you page URL:**
- Brevo email automatically sent within 5 minutes of payment confirmation. Subject: *"Complete your [service] intake"* with the secure link.
- Buyer can recover the link from their email even if they closed the tab.

**Payment validation fails on the thank-you page:**
- If the `payment_id` doesn't exist, is too old, or doesn't match the service, show a friendly error: *"We couldn't verify your payment. If you've just paid, give it 30 seconds and refresh. If not, please complete payment first or WhatsApp Kagiso."*
- Log the attempt in Supabase for security review (someone might be trying URLs without paying)

**No available cal.com slots within reasonable time:**
- cal.com displays the next available slots automatically
- If the buyer wants something sooner, cal.com has a "request a custom time" option that emails Kagiso
- For Career Clarity specifically, cap weekly slots at 4 per the playbook capacity rule

**Buyer wants to cancel within the refund window:**
- For session services: cal.com handles the reschedule/cancel flow natively
- For async services: manual process — buyer emails hello@coachkagiso.co.za, Kagiso confirms refund minus PayFast fees per the T&C
- Don't build a self-serve refund flow yet; volume doesn't justify it

**Buyer wants something not on the menu:**
- Every service page has a *"Got questions? WhatsApp me first"* CTA below the main button
- For custom requests, Kagiso handles via WhatsApp and creates a manual PayFast invoice

**Bundle confusion (CV + LinkedIn):**
- The Bundle is a single product. Don't let the buyer accidentally double-buy CV Revamp + LinkedIn Optimisation separately at R700 when the Bundle is R500.
- On the CV Revamp and LinkedIn checkout pages, add a small note: *"Need both? The CV + LinkedIn Bundle is R500 — saves you R200."*

---

## What Kagiso needs to see in real time

Setup notification flow:

| Event | Where Kagiso sees it | How it gets there |
|---|---|---|
| Payment received (Type A) | Slack message + Brevo email | PayFast webhook → Supabase Edge Function → Slack webhook |
| Intake form submitted (Type A) | Slack message with form data + signed URLs to file downloads | Supabase database trigger → Edge Function → Slack webhook |
| Booking made (Type B) | Slack + cal.com email + Google Calendar invite | cal.com webhook → Slack |
| Brevo email opened/clicked | Brevo dashboard (weekly review) | Brevo native analytics |
| Refund requested | Email to hello@coachkagiso.co.za | Manual handling |
| Suspicious payment validation attempt | Supabase log table; weekly review | Logged in `validation_attempts` table |

The Slack alerts use Slack's incoming webhook URLs — free for any workspace, easy to set up. Each event type can have its own channel or just one #notifications channel.

---

## Cookie consent banner

The Privacy Policy commits to a cookie consent banner. The AI builder must implement one before launch. Free options:

- **Self-built** — simple JS banner that sets a localStorage flag for analytics consent. With Cursor or Claude Code, this is a 30-minute build and stays inside the same codebase. Recommended for consistency.
- **CookieYes** — free up to 25K visits/month if you want a third-party solution
- **Cookiebot** — free up to 100 pages

The banner must:
- Default essential cookies on
- Default analytics cookies off
- Provide a clear "Accept" / "Decline" / "Customise" set of options
- Re-prompt every 12 months
- Not block the page or interrupt the flow

---

## Implementation sequence

The order matters. Build it in this sequence so each step has the right foundations.

| Phase | Task | Tools | Time estimate |
|---|---|---|---|
| 1 | Create PayFast hosted checkout pages for the 5 Type A services | PayFast | 2 hours |
| 2 | Set up Stripe South Africa account, connect to cal.com | Stripe, cal.com | 1 hour |
| 3 | Create cal.com event types for the 3 Type B services with intake questions and Stripe payment | cal.com | 4 hours |
| 4 | Set up Supabase: create `payments` and `intake_submissions` tables; create `client-uploads` storage bucket; configure Row Level Security | Supabase | 2 hours |
| 5 | Build the PayFast ITN webhook receiver (Supabase Edge Function) and validate it with PayFast test transactions | Supabase, PayFast | 2 hours |
| 6 | Build the 5 native intake forms in Next.js (one per Type A service), with payment validation and Supabase save | Next.js, Cursor/Claude Code | 6-8 hours total (vibe-coded, ~1.5 hours per form) |
| 7 | Build the 5 thank-you pages that host the forms with payment validation logic | Next.js | 2 hours (one template, 5 instances) |
| 8 | Wire up Brevo: contact list, automation flows, transactional emails | Brevo | 4 hours |
| 9 | Set up Slack incoming webhooks; wire to Supabase database triggers and Edge Functions for notifications | Slack, Supabase | 2 hours |
| 10 | Build the cookie consent banner | Next.js | 1 hour |
| 11 | End-to-end test for each service (buy as a customer, verify every step) | Manual | 4 hours |
| 12 | Soft launch with 3 trusted past clients before public announcement | Manual | Varies |

**Total setup time:** roughly 30-32 hours of focused work, plus testing. Spread across 2-3 weeks alongside the website build.

The native form build (step 6) is the biggest single block, but it's vibe-codeable — Cursor or Claude Code can generate a form component that handles file upload to Supabase Storage, multi-step navigation, validation, and database save in one or two prompts per form. Reuse the same component pattern across all five.

---

## End-to-end testing checklist

Before any service goes live, run this test from a private browser session as if you're a real customer.

**For each Type A service:**
- [ ] Click the CTA from `/work-with-me` and arrive at the right `/buy/[service]` page
- [ ] Click pay and complete PayFast test transaction
- [ ] Confirm webhook fires and writes to Supabase `payments` table
- [ ] Confirm redirect to the right `/thanks/[service]?payment_id=XXX` page
- [ ] Confirm the form loads (payment validation passes)
- [ ] Try the same URL with a fake `payment_id` — confirm error displays
- [ ] Try the URL with a `payment_id` from yesterday — confirm error displays (recency check)
- [ ] Fill the form, upload a file, submit
- [ ] Confirm submission writes to Supabase `intake_submissions` table
- [ ] Confirm file lands in correct Supabase Storage bucket folder
- [ ] Confirm confirmation email arrives within 5 minutes
- [ ] Confirm Slack notification reaches Kagiso with correct data and signed download URL
- [ ] Click the signed URL — confirm the file downloads correctly

**For each Type B service:**
- [ ] Click the CTA from `/work-with-me` and arrive at the right cal.com page
- [ ] Verify available time slots match Kagiso's actual availability
- [ ] Fill intake questions and book a test slot
- [ ] Make a test payment via Stripe
- [ ] Confirm cal.com confirmation email arrives with Zoom link
- [ ] Confirm cal.com webhook mirrors data into Supabase
- [ ] Confirm Brevo automation triggers the welcome sequence
- [ ] Confirm Google Calendar invite reaches Kagiso

**For the masterclass specifically:**
- [ ] Verify seat counter decrements correctly
- [ ] Verify early-bird vs standard pricing toggles based on timing (Sunday 21:00 cutoff)
- [ ] Verify the 5-question intake form (with POPIA consent) is required

**Failure path tests:**
- [ ] Cancel a payment mid-flow — verify the failed-payment page works
- [ ] Pay but abandon the intake form — verify the 24-hour reminder email triggers
- [ ] Try to load a thank-you page with no `payment_id` parameter — verify error
- [ ] Try to pay for a fully-booked masterclass — verify the seat counter prevents it
- [ ] Submit the form twice with the same `payment_id` — verify duplicate prevention

---

## What this looks like for the buyer

Two examples to make this concrete.

**Example 1 — Thandi buying a CV Review (Type A):**
1. Thandi reads the CV Review section on `/work-with-me`. Clicks "Get my CV reviewed."
2. PayFast checkout loads. She pays R150 with her bank card. 90 seconds.
3. Redirects to `/thanks/cv-review?payment_id=ABC123`. Page validates her payment in 200ms, renders Kagiso's note and the form.
4. She uploads her CV, types her email, names the role she's applying for, clicks Submit. 4 minutes.
5. Confirmation email arrives within a minute: *"Got your CV. I'll record your review and have it back to you within 48 hours."*
6. Slack notification reaches Kagiso instantly with the form data and a download link to Thandi's CV.
7. 47 hours later, a Loom video link arrives. Thandi watches it twice and applies the changes.

Total time from click to "Kagiso has everything": about 5 minutes. Total time from purchase to delivery: under 48 hours.

**Example 2 — Sipho booking the Glow Up VIP (Type B):**
1. Sipho reads the Glow Up VIP section. Clicks "Book my Glow Up."
2. cal.com page loads with available kick-off slots and the intake form.
3. He picks Saturday 17 May at 10:00, fills the intake (CV upload, LinkedIn URL, role he's targeting, current interview history). 6 minutes.
4. Pays R1,200 via Stripe.
5. Confirmation email arrives with the Zoom link, a clear breakdown of the 30-day plan, and the kick-off session calendar invite.
6. cal.com webhook mirrors his intake data into Supabase so Kagiso has it in her unified backend.
7. On Saturday morning, the session starts on time. Zero friction.

Total time from click to confirmed booking: about 8 minutes. Total time before the work starts: 0 — Kagiso has everything she needs.

---

## What I'd push back on if anyone proposes it

Three temptations worth resisting during build.

**1. Building a custom shopping cart.** Don't. The architecture above explicitly avoids a cart because nobody buys multiple Kagiso services in one transaction. Each service is a complete purchase decision. A cart adds complexity for no buyer benefit.

**2. Trying to consolidate PayFast and Stripe into one tool.** The dual-payment-processor split is intentional. PayFast handles Type A because PayJustNow instalments matter at the R150-R500 price points. Stripe handles Type B because cal.com integrates natively and the higher-ticket sessions can absorb the slightly different fee structure. Forcing one tool to do both jobs adds friction.

**3. Asking the buyer for too much information up front.** Every extra intake question drops conversion 5-10%. Every form above starts with the bare minimum and adds context only where Kagiso genuinely needs it to deliver. If she finds herself emailing a buyer to ask for something the form should have captured, add it to the form for the next round. Don't preemptively bloat the form.

**4. Over-engineering the form components.** The native form pattern is: text inputs, textareas, file uploads, validation, submit to Supabase. That's it. Don't build a multi-step wizard with progress bars and animations for a 6-question form. Keep the form components simple, the validation tight, and the success state clear. Cursor will be tempted to add fancy UX patterns. Push back.

---

## Maintenance and review

The buying flow is built once and then largely runs itself. Two scheduled review points:

**Monthly:** Spot-check three random transactions end-to-end. Are confirmations arriving? Are intake forms complete? Are notifications reaching Kagiso? Run a payment validation attempt with a fake token to confirm security still works. 15 minutes per month.

**Quarterly:** Review conversion data in Vercel/Brevo analytics and Supabase. Where are people dropping off? If a specific intake form has a 50% completion rate, it's too long or asking for too much. Cut a question and re-test. Check the `validation_attempts` log for any patterns of suspicious URL access.

**On Phase 2 launch (October 2026):** Add the same flows for First 90 Days Coaching (Type B, cal.com) and Leadership Launchpad (Type B, cal.com, multi-session like Glow Up VIP). The infrastructure is reusable; only the content changes. The native form pattern from Type A services can also be extended to a Skills Pathway add-on if she introduces one later.
