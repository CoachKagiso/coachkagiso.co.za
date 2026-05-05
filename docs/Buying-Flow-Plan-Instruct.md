
**The buying flow plan has been updated to v1.1. Please read the @Buying-Flow-Plan.md document in full before starting. Here is a summary of what needs to be built and the decisions made outside the document:**

---

**STACK DECISIONS:**
- Tally is removed — all intake forms built natively in Next.js ✅
- Zapier is removed — all notifications go through Brevo ✅
- Slack is removed — Brevo handles all notifications to Kagiso ✅
- Supabase handles form submissions, file storage, and payment validation ✅
- PayFast handles all Type A payments ✅
- Stripe handles Type B payments via cal.com (to be set up separately) ✅

---

**ENVIRONMENT VARIABLES — all in `.env.local`:**
```
NEXT_PUBLIC_PAYFAST_MERCHANT_ID=
NEXT_PUBLIC_PAYFAST_MERCHANT_KEY=
PAYFAST_PASSPHRASE=
NEXT_PUBLIC_PAYFAST_SANDBOX=true
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BREVO_API_KEY=
NEXT_PUBLIC_BREVO_LIST_ID=
NEXT_PUBLIC_SITE_URL=https://coachkagiso.co.za
NEXT_PUBLIC_CONTACT_EMAIL=hello@coachkagiso.co.za
NEXT_PUBLIC_CAL_DISCOVERY_URL=https://cal.com/coachkagiso/discovery-call
NEXT_PUBLIC_CAL_CLARITY_URL=https://cal.com/coachkagiso/career-clarity
NEXT_PUBLIC_CAL_GLOW_UP_URL=https://cal.com/coachkagiso/glow-up-vip
NEXT_PUBLIC_CAL_MASTERCLASS_URL=https://cal.com/coachkagiso/saturday-masterclass
```

---

**BUILD SEQUENCE — follow this order exactly:**

**Phase 1 — Supabase setup**
Create the following tables in Supabase:

`payments` table:
```
- id (uuid, primary key)
- payment_id (text, unique)
- service_slug (text)
- amount (numeric)
- status (text — pending/confirmed/failed)
- buyer_email (text)
- buyer_name (text)
- created_at (timestamp)
- confirmed_at (timestamp)
```

`intake_submissions` table:
```
- id (uuid, primary key)
- payment_id (text, foreign key → payments.payment_id)
- service_slug (text)
- form_data (jsonb)
- cv_file_url (text)
- submitted_at (timestamp)
- duplicate_attempt (boolean, default false)
```

Create a storage bucket called `client-uploads` with the following folder structure:
```
client-uploads/
  cv-review/
  cv-revamp/
  cover-letter/
  linkedin/
  bundle/
```

Enable Row Level Security on all tables. Only the service role key can write to `payments`. Authenticated submissions can write to `intake_submissions`.

---

**Phase 2 — PayFast ITN webhook**

Create a Supabase Edge Function at `/api/payfast/notify` that:
- Receives PayFast's ITN POST request
- Validates the payment signature using `PAYFAST_PASSPHRASE`
- Confirms payment status is COMPLETE
- Writes a row to the `payments` table with status `confirmed`
- Returns HTTP 200

This URL must be added to PayFast dashboard → Settings → Notifications → Notify URL once live:
```
https://coachkagiso.co.za/api/payfast/notify
```

---

**Phase 3 — Buy pages (5 pages)**

Create the following routes. Each page shows a service summary and a PayFast checkout button:

| Route | Service | Amount |
|---|---|---|
| `/buy/cv-review` | 48-Hour CV Review | R150 |
| `/buy/cv-revamp` | CV Revamp | R400 |
| `/buy/cover-letter` | Cover Letter | R150 |
| `/buy/linkedin` | LinkedIn Optimisation | R300 |
| `/buy/bundle` | CV + LinkedIn Bundle | R500 |

Each PayFast checkout must pass:
- `merchant_id`, `merchant_key`
- `return_url` → `/thanks/[service]?payment_id=XXX`
- `cancel_url` → `/buy/[service]/failed`
- `notify_url` → `/api/payfast/notify`
- `amount` → pre-filled per service
- `item_name` → service name

Also create a `/buy/[service]/failed` page with this copy:
> *Payment didn't go through. This is usually a card or bank issue, not your fault. Try a different card or use the EFT option. If it keeps failing, WhatsApp me and I'll send a manual invoice.*

---

**Phase 4 — Thank-you pages with payment validation (5 pages)**

Create the following routes:

| Route | Service | Turnaround |
|---|---|---|
| `/thanks/cv-review` | 48-Hour CV Review | 48 hours |
| `/thanks/cv-revamp` | CV Revamp | 5 working days |
| `/thanks/cover-letter` | Cover Letter | 5 working days |
| `/thanks/linkedin` | LinkedIn Optimisation | 5 working days |
| `/thanks/bundle` | CV + LinkedIn Bundle | 7 working days |

Each page must:
1. Read `payment_id` from URL params
2. Query Supabase `payments` table to validate:
   - Payment exists
   - Status is `confirmed`
   - Service matches the URL
   - Payment is within the last 30 minutes
3. If valid → render the intake form
4. If invalid → show: *"We couldn't verify your payment. If you've just paid, give it 30 seconds and refresh. If the problem continues, WhatsApp Kagiso."*

Page heading (Noto Serif Display):
> *Got it. Now I need 5 minutes of your time.*

---

**Phase 5 — Native intake forms**

Build one form per service. All forms follow the same pattern — text inputs, textareas, file upload, validation, submit to Supabase. Keep them simple. No multi-step wizards.

On submission each form must:
1. Upload CV file to correct `client-uploads/[service]/` folder in Supabase Storage
2. Generate a signed download URL (valid 7 days)
3. Save all form data to `intake_submissions` table
4. Check for duplicate `payment_id` — if duplicate, set `duplicate_attempt: true` and show: *"It looks like you've already submitted. If you need to make changes, email hello@coachkagiso.co.za"*
5. Trigger Brevo confirmation email to client
6. Trigger Brevo notification email to Kagiso

Submit button label: **"Send my details"** — never "Submit"

Confirmation message after submission:
> *Got it. Kagiso will be in touch within [turnaround time].*

---

**Form fields per service:**

**CV Review**
- Full name (required)
- Email address (required)
- WhatsApp number (optional)
- What role or roles are you currently applying for? (required)
- What's the one thing you most want me to look at? (required)
- Instruction text: *Please email your CV to hello@coachkagiso.co.za — subject: Your Name — CV Review*

**CV Revamp**
- Full name (required)
- Email address (required)
- WhatsApp number (optional)
- What role or industry are you targeting? (required)
- What's your current role and how long have you been in it? (required)
- What do you feel isn't working about your current CV? (required)
- Instruction text: *Please email your CV to hello@coachkagiso.co.za — subject: Your Name — CV Revamp*

**Cover Letter**
- Full name (required)
- Email address (required)
- What role are you applying for? Paste the job title and company (required)
- Paste the job description or key requirements here (required)
- What makes you the right person for this role? (required)
- Instruction text: *Please email your CV to hello@coachkagiso.co.za — subject: Your Name — Cover Letter*

**LinkedIn Optimisation**
- Full name (required)
- Email address (required)
- Your LinkedIn profile URL (required)
- What roles or industries do you want recruiters to find you for? (required)
- What's the one part of your LinkedIn that frustrates you most right now? (required)
- Are you currently job hunting or building visibility for the long game? (required)

**CV + LinkedIn Bundle**
- Full name (required)
- Email address (required)
- WhatsApp number (optional)
- Your LinkedIn profile URL (required)
- What role or industry are you targeting? (required)
- What's your current role and how long have you been in it? (required)
- What do you feel isn't working about your current CV? (required)
- What roles or industries do you want recruiters to find you for? (required)
- Instruction text: *Please email your CV to hello@coachkagiso.co.za — subject: Your Name — CV + LinkedIn Bundle*

---

**Phase 6 — Brevo email setup**

Set up the following transactional emails via Brevo API using `BREVO_API_KEY`. All emails send from hello@coachkagiso.co.za.

**Email 1 — Client confirmation (fires on form submission)**
- To: client email
- Subject and body: use the copy from Buying-Flow-Plan.md for each service

**Email 2 — Kagiso payment notification (fires on PayFast ITN confirmation)**
- To: hello@coachkagiso.co.za AND accounts@coachkagiso.co.za
- Subject: `New Payment — {service} — {amount}`
- Body:
```
New payment received.

Name: {name}
Email: {email}
Service: {service}
Amount: {amount}
Date: {timestamp}
Delivery due: {deadline}
```

**Email 3 — Kagiso intake notification (fires on form submission)**
- To: hello@coachkagiso.co.za
- Subject: `New Intake — {service} — {name}`
- Body:
```
A client has submitted their intake form.

Name: {name}
Email: {email}
WhatsApp: {whatsapp}
Service: {service}
Delivery due: {deadline}

Their responses:
{all_form_fields}

CV download link (valid 7 days):
{signed_cv_url}
```

**Email 4 — 24-hour intake reminder to Kagiso (fires if form not submitted 24hrs after payment)**
- To: hello@coachkagiso.co.za
- Subject: `Follow Up Needed — {name} paid but hasn't submitted intake`
- Body:
```
{name} paid for {service} 24 hours ago but hasn't submitted their intake form.

Their email: {email}

Follow up via WhatsApp or email to prompt them to complete the form.
```

Also add every client who submits a form to Brevo contact list ID `NEXT_PUBLIC_BREVO_LIST_ID`.

---

**Phase 7 — Cal.com booking pages**

Create the following pages embedding the cal.com widget:

| Route | env variable |
|---|---|
| `/book/discovery` | `NEXT_PUBLIC_CAL_DISCOVERY_URL` |
| `/book/clarity` | `NEXT_PUBLIC_CAL_CLARITY_URL` |
| `/book/glow-up` | `NEXT_PUBLIC_CAL_GLOW_UP_URL` |
| `/book/masterclass` | `NEXT_PUBLIC_CAL_MASTERCLASS_URL` |

Use `@calcom/embed-react` package. Pull URLs from env variables.

Create `/thanks/booked` page with copy:
> *You're booked. Check your email for your confirmation and Microsoft Teams link. See you soon. — Kagiso*

---

**Phase 8 — Connect all CTAs on Work With Me page**

| Service | CTA Label | Route |
|---|---|---|
| CV Review | Get my CV reviewed | `/buy/cv-review` |
| CV Revamp | Revamp my CV | `/buy/cv-revamp` |
| Cover Letter | Write my cover letter | `/buy/cover-letter` |
| LinkedIn Optimisation | Optimise my LinkedIn | `/buy/linkedin` |
| CV + LinkedIn Bundle | Get the bundle | `/buy/bundle` |
| Career Clarity Session | Book my Clarity Session | `/book/clarity` |
| Glow Up VIP | Book my Glow Up | `/book/glow-up` |
| Saturday Masterclass | Hold my spot | `/book/masterclass` |
| Discovery Call | Book a free discovery call | `/book/discovery` |

---

**Phase 9 — End-to-end testing**

Run the full testing checklist from Buying-Flow-Plan.md v1.1 in sandbox mode. Report back with pass/fail for every item on the list.

---
