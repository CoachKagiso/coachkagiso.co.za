# Brand Brief — Kagiso Shabangu Coaching Practice

**How to use this document:** paste the full text below into the start of any AI conversation that's helping you build her website, write copy, design assets, or generate marketing content. It gives the AI full context on her brand so it doesn't invent, drift, or ask you the same questions repeatedly.

---

## PASTE-READY CONTEXT (everything below this line)

You are helping me build assets for **Kagiso Shabangu**, a South African Career Development & Personal Brand Coach. She runs a coaching practice as a side business while employed full-time. Use the brand details below as the source of truth. Do not invent details I haven't given you. If something is missing or unclear, ask before assuming.

### 1. Identity

- **Name:** Kagiso Shabangu (always "Kagiso," never "Kay" or "Tebogo" — those are legacy variants we are retiring)
- **Title:** Career Development & Personal Brand Coach (never "Strategist," never "Career Coach" alone, never "Career Development & Coaching Services")
- **Tagline:** "Show up. Stand out. Level up."
- **Domain:** coachkagiso.co.za
- **Email:** hello@coachkagiso.co.za
- **Location:** South Africa

### 2. Audience

- South Africans, early-to-mid career
- Three primary segments:
  1. Unemployed graduates (0–3 years out of varsity)
  2. Stuck early-career professionals feeling no momentum
  3. Career changers wanting to pivot industries
- The audience is mostly on LinkedIn and TikTok. She has ~5K LinkedIn followers and ~3K TikTok followers.

### 3. Brand voice

- Warm but direct. No fluff.
- Sounds like a coach with a method, not a lifestyle brand.
- Short sentences. Conversational rhythm.
- Natural South African references where they fit (not forced — she will write actual SA voice when she sees it).
- Code-switching is welcome where she'd do it naturally (e.g. occasional IsiZulu like "ukuthi") — never invented for marketing flavour.
- Avoid generic motivation copy ("you've got this," "believe in yourself"). Always teach something concrete or tell a real story.

### 4. Brand vocabulary — words she's chosen for what she does

Use these words throughout copy, headings, and bios:
- Leadership
- Mentorship
- Career coaching
- Skills development
- People development
- Training
- Facilitating
- MCing (corporate events)
- Career advice
- Personal branding
- Career evolution (preferred over "growth")

Long-term direction: life coaching.

### 5. Brand firewall — non-negotiable

She runs the coaching business alongside full-time employment. The two must stay completely separated in any public-facing content.

**Never mention or include:**
- Her current employer's name, logo, or affiliation
- Any professional designations paid for or sponsored by her employer
- Industry-specific framing (insurance, banking, financial services) anywhere on the public site, social posts, or marketing copy
- Corporate awards she's received from her employer
- The legacy "Tebogo" first name or any tebogo.shabangu Gmail address

This isn't a stylistic preference — it's a contractual/ethical firewall. The brand is industry-agnostic by design.

### 6. Visual identity

**Colour palette** (use these exact hex codes as CSS custom properties or Tailwind config values):

| Name | Hex | Where to use |
| --- | --- | --- |
| **Dark Gunmetal** | `#142334` | Headlines, body text, primary CTA buttons, dark sections |
| **Rodeo Dust** | `#C9AD98` | Secondary buttons, accents, icons, hover states, eyebrow text |
| **Chai** | `#E4D8CB` | Section backgrounds (lead magnet, soft blocks), card panels |
| **Latte** | `#A09086` | Secondary text, borders, captions |
| **White** | `#FFFFFF` | Base background, text on dark backgrounds |

The palette also includes **Froth (#E8E3DF)** and **Creme (#CDC6C3)** as additional warm neutrals if needed for layering, but use sparingly — five shades of warm neutral can blur design clarity. Default to Chai for soft sections and Latte for borders/secondary text.

**Accessibility rule (important):** Rodeo Dust (#C9AD98) does NOT have enough contrast against white text to pass WCAG AA. Buttons or surfaces using Rodeo Dust must use **Dark Gunmetal text**, not white. White text is reserved for buttons or surfaces using Dark Gunmetal as the background.

**Typography:**
- Body and UI: **Inter** (Google Fonts), weights 300, 400, 500, 600
- Display headings: **Playfair Display** (Google Fonts), weights 500, 600, 700 — for H1/H2 and the tagline "Show up. Stand out. Level up."
- Signature/flourish: **Northwell** (or similar brush font) — see strict-use rule below

**Type rules — non-negotiable:**
- DO NOT use Northwell or any brush/script font in headlines, body copy, buttons, eyebrow labels, or section titles. Brush fonts are restricted to ONE specific use only: the literal signature line at the end of the About page, e.g. *"— Kagiso"* — like a handwritten signoff. Nowhere else.
- DO NOT set body copy in italic. Italic is reserved for emphasis on a single word or short phrase, set in Playfair Display italic for headings or Inter italic for body.
- DO NOT add a fourth font. The system is Inter + Playfair Display + Northwell (signature only).

**Layout principles:**
- Mobile-first, fully responsive
- Generous whitespace, sections breathe
- Card radius: 16px. Pill button radius: 9999px. Input radius: 12px.
- Subtle shadows only — no heavy drop shadows

**CTA system:**
- **Primary:** solid Dark Gunmetal (#142334) background, white text, pill shape, Inter 600. Hover: slight darken or 1px lift. Use this when conversion is the goal — Book buttons, Hold My Spot, Download CTAs.
- **Secondary:** Rodeo Dust (#C9AD98) background, Dark Gunmetal text, pill shape, Inter 600. Use for non-conversion actions where the dark CTA would feel too aggressive — exploratory clicks, lower-stakes navigation.
- **Tertiary (ghost):** transparent background, 1px Dark Gunmetal border, Dark Gunmetal text, pill shape. Used for "Learn more" or "See details" patterns.
- **Text link:** Inter 500, Dark Gunmetal, with a 2px Rodeo Dust underline at 4px offset on hover.

Critical: do NOT use Rodeo Dust as the primary CTA colour even though it's a brand colour. It's too close in tone to Chai backgrounds to drive conversion. Dark Gunmetal is the only colour in the palette with enough visual weight to act as a primary action signal.

### 7. Site architecture (multi-page)

The site is being built as a multi-page website. The launch-blocking page set is:

- **Home** — brand-led hero, who she is, what she does, signposts to other pages
- **About** — her story, her approach, her credentials (in coaching terms, not industry terms)
- **Services** — the four 1-on-1 packages with pricing and "what's included"
- **Masterclass** — the Saturday Masterclass details, schedule, pricing, booking
- **Contact / Book** — booking form, WhatsApp link, email

Future pages (do NOT build for launch unless I specifically ask): Blog, Resources, FAQ, Testimonials, Free Lead Magnet landing.

### 8. Services and pricing (locked — do not change these numbers)

**1-on-1 packages:**

| Package | Price | What's included |
|---|---|---|
| CV Revamp & Cover Letter | R400 | Professionally rewritten CV (PDF + editable), tailored cover letter, two rounds of revisions, 5-day turnaround |
| LinkedIn Optimisation & CV Revamp | R500 | LinkedIn profile fully optimised (headline, About, experience), banner and photo guidance, professional CV revamp included, post strategy |
| Career Clarity Package | R800 | 60-min one-on-one Career Clarity Session (Zoom), written personalised career action plan, CV revamp included, two-week follow-up |
| Glow Up VIP Package | R1,200 | Two one-on-one sessions, full CV revamp, full LinkedIn optimisation, interview positioning and prep, 30-day post-session WhatsApp support |

**Saturday Masterclass:**

- 2-hour live group session on Zoom Pro
- Every second Saturday, 10:00–12:00 SAST
- Capacity: 4–15 people (scaling — starts at 4–6, grows to 12–15)
- **R450 early bird** (closes 21:00 Sunday before session week) → **R500 standard**
- Cohort-based: runs July–September each year, then closes until the next year
- Launches first Saturday of July 2026

### 9. Funnel logic

The masterclass is the lead product (lowest entry price, group format, builds the email list). It feeds into the 1-on-1 packages via a 48-hour post-class R100-off bonus on CV Revamp (R400 → R300) and LinkedIn Package (R500 → R400). The bigger packages (Clarity, VIP) are not pitched from the masterclass stage — they're offered in personal DMs when an attendee's needs are bigger than the group format.

### 10. Things NOT to do

- DO NOT invent testimonials. We have four real ones (three from LinkedIn comments, one from TikTok pinned post). All marked-up testimonial sections should use placeholder text saying "REPLACE WITH REAL TESTIMONIAL" until I provide the real ones.
- DO NOT use the legacy email tebogo.shabangu3@gmail.com anywhere
- DO NOT use placeholder lorem ipsum copy — use the real copy I provide
- DO NOT add follower counts, statistics, or numbers I haven't given you (no "100+ clients coached" type claims)
- DO NOT use the brush/script font (Northwell) anywhere except the signature line on the About page. Not in headlines, body, buttons, eyebrows, or section titles.
- DO NOT use Rodeo Dust as a primary CTA colour. Dark Gunmetal is the only primary CTA colour. Rodeo Dust buttons must use Dark Gunmetal text (white text on Rodeo Dust fails accessibility contrast).
- DO NOT mention insurance, banking, financial services, or her current employer
- DO NOT default to "Career Coach" or "Career Strategist" — always full title "Career Development & Personal Brand Coach"

### 11. If you're unsure

If you need information I haven't given you — ask. Don't assume. Specifically: ask before adding stats, testimonials, photos, credentials, or any factual claim about her practice. Ask before deviating from the colour palette or typography. Ask before adding a page that isn't on the launch-blocking list above.
