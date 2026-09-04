# Coach Kagiso — Knowledge Transfer Document

> Written: 2026-08-20. Purpose: hand over the full picture of the coach-kagiso monorepo (Next.js public site + owner dashboard + content/design studios) so a new AI can take over branding work and fixing low-quality carousel exports from the design studio.
> Rules honoured: exact paths, versions, config values, pixel dimensions, scale factors, API endpoints, table names, env var names (values never copied). Short code snippets for critical pipelines (image/carousel export). "Not present" stated for N/A sections. Anything unknown is explicitly flagged. Nothing fabricated.

---

## 1. Project overview

- **Brand**: Coach Kagiso — career coaching (Tebogo Shabangu; assistant greets with "Coach Kagiso"). Public site: `https://coachkagiso.co.za`. Zoho mailbox: `hello@coachkagiso.co.za`. Google Calendar id: `tebogo.shabangu3@gmail.com`.
- **Repo**: `G:\AntiGravity Projects\coach-kagiso`. Git: clean at `e72ac43` ("add visible edge to assistant panel and stop clean dashboard styles from stripping it" — the Phase 1 fix, pushed).
- **Stack** (from `package.json`):
  - Next.js `^16.2.4` (App Router), `output: 'standalone'`, Turbopack, dev server on port **4100**.
  - React `^19.2.1`, TypeScript `5.9.3`, Tailwind CSS `4.1.11`.
  - `@supabase/supabase-js ^2.105.1`, `pg ^8.21.0`.
  - `html2canvas ^1.4.1`, `jspdf ^4.2.1` (client-side image/PDF export), `@react-pdf/renderer ^4.5.1` (server PDF), `docx ^9.6.1` (CV builder .docx), `mammoth`, `pdf-parse`, `pdfjs-dist` (legacy build, CV text extraction).
  - `lenis`, `motion ^12.38.0`, `lucide-react ^0.553.0`, `@calcom/embed-react ^1.5.3`.
- **Two surfaces in one repo**:
  1. **Public marketing site** — pages under `app/(marketing)/`, `app/buy/[service]`, `app/book`, diagnostic, lead magnets, resources.
  2. **Owner dashboard** (single-page-app style) — hosted at `app/resources/career-diagnostic/submissions/page.tsx` (`/resources/career-diagnostic/submissions`), gated by admin key/Google OAuth dashboard session.
- **Deployment**: Vercel. `vercel.json` crons: `/api/messages/import-inbound` (0 7 * * *), `/api/email/backlog/digest` (0 5 * * *). `next.config.ts` sets image remote patterns `picsum.photos` + `images.unsplash.com` and security headers on `/resources/career-diagnostic/submissions/:path*` and `/api/dashboard/session/:path*`.
- **The job that motivated this document**: branding consistency work + "carousel exports from the design studio look low quality" — see Sections 5 and 12.

---

## 2. Feature inventory

### Public site
- Home, work-with-me, about, thanks pages (marketing).
- `/buy/[service]` checkout pages (static params, upgrade + booking tokens).
- `/book` page (Cal.com embeds for discovery/clarity/glow-up).
- Career diagnostic: multi-step form (`/resources/career-diagnostic`), `/api/diagnostic/submit`, admin export `/api/diagnostic/export`, playbook PDF `/api/diagnostic/playbook-pdf`.
- Lead magnets: CV checklist, interview prep (each has its own lead source; masterclass intentionally REMOVED from diagnostic + lead-magnet emails — commit 42c5646).
- Masterclass page (Saturday session, early-bird pricing).

### Owner dashboard (single page, tab-routed)
- Primary tabs: `dashboard | leads | pipeline | clients | finance | career-tools`
- Studio tabs: `content | carousel | design | tools` (ContentStudio workspace with 4 internal workspaces: content, carousel, design, tools)
- Secondary tabs: `calendar | messages | tasks | notes | settings`
- Dashboard sub-features: funnel activity, follow-up notifications, business goals (horizons/categories/statuses), sidebar with today summary, profile photo.
- Career tools: CV analyser, CV builder, client strategy workspaces (career-clarity + glow-up-vip), session prep/debrief, strategy plans + export + delivery.
- Settings bundle: AI config (provider/model/test mode), business profile, hours, services, notifications, assistant personality/preferences, email templates, OpenRouter key.
- Growth OS Assistant: chat panel (sidebar, `/api/assistant`), read-only context via `/api/assistant/context`.

### Studios (client-side heavy)
- **Content Studio**: calendar, backlog, research, AI generation (linkedin/tiktok/instagram/facebook/email content types), smart suggestions, humanizer, transform pipeline (fetch-image/stage1/stage2), vault.
- **Carousel Studio**: carousel drafts from generated content or manual; template registry; export PNG/PDF per platform aspect.
- **Design Studio**: 1080×1350 manifesto default canvas, layers/pages, template system (localStorage), import from carousel drafts, PNG/PDF export, asset library, brand assets.
- **Tools workspace**: CV analyser + CV builder entry.

### Other
- Email: sent-email log, inbound reply import (Zoho), backlog + digest, follow-up sequences (drip email templates), email templates from DB, Brevo (Sendinblue) contact sync.
- Payments: PayFast (primary), `payments` table, provider abstraction (`lib/payment-provider.ts`), payment webhook, upgrade credits, booking-payment tokens.
- Calendar: Cal.com webhooks → events; Google Calendar read.
- Auth: Google OAuth (dashboard session), Zoho OAuth (mail), diagnostic admin key (`x-diagnostic-admin-key` header / `key` param).

---

## 3. Module-by-module detail

### 3.1 Dashboard host page — `app/resources/career-diagnostic/submissions/page.tsx` (2654 lines)
- Server component; auth gate via `isDashboardServerAuthorized()` → `<AccessGate>`; admin key via `DASHBOARD_SESSION_CLIENT_MARKER`.
- Search params drive everything: `tab`, `studio`, `client`, `view`, `archetype`, `status`, `source`, `followUp`, `q`, `from`, `to`, `segment`, `state`, `sort`, `updated`, `deletedCount`, `error`, `auth`, `key`.
- Main wrapper (line ~1561): `<main class="coach-dashboard-clean min-h-screen overflow-x-clip bg-[#EDEBE8] text-[#142334]">`.
- Server data load (`Promise.all`, lines 1181–1240): submissions, operations, manual tasks, task notes, sent-email log, inbound replies, assistant sent-email log, client records, content calendar, content backlog, research, follow-up + event notification counts/lists, sidebar follow-ups, business goals settings, settings bundle (only when `tab==='settings'`), profile photo.
- Filters: `isDiagnosticArchetypeKey`, `isDiagnosticLeadStatus`, `isDiagnosticLeadSource`, follow-up filter (`due|scheduled|none|all`); `activeTab = isDashboardTab(tab) ? tab : 'dashboard'`; `activeStudioWorkspace = isStudioWorkspace(studio) ? studio : 'content'`.
- Content tab renders `<ContentStudio key={activeStudioWorkspace} ... />` (line ~2460) — the `key` forces remount per workspace.
- Export link: `/api/diagnostic/export?key=...&archetype=...&source=...`.

### 3.2 Sidebar — `components/DashboardSidebar.tsx`
- Primary: `dashboard|leads|pipeline|clients|finance|career-tools`
- Studio group (collapsible): `content|carousel|design|tools`
- Secondary: `calendar|messages|tasks|notes|settings`

### 3.3 Growth OS Assistant
- Chat panel component: `components/assistant/GrowthOSAssistant.tsx` (styled `rounded-[12px] border border-[#E4D8CB] bg-[#F5F3EE]` after Phase 1 fix).
- System prompt: `buildAssistantSystemPrompt` in `lib/growth-os-assistant.ts:728`.
- Personality block (lines 700–726) built from `AssistantPreferences` (`lib/settings.ts` + `lib/assistant-preferences.ts`):
  - `tone: 'bubbly_friend' | 'strategic_partner' | 'focused_operator'`
  - `bubblyNicknames: ['Kay', 'Mush', 'Coach', 'Ms. CEO']`
  - `greetNaturally`, `proactiveBriefings`, `allowEmojis`
- SERVICES block (lines 834–841): Career Clarity R800/75min; Glow Up VIP R1200/30-day; CV+LinkedIn Bundle R500/7d; Saturday Masterclass R450 early bird; CV Revamp R400/5d; LinkedIn Optimisation R300/5d.
- Context: recent inbound replies + logged outbound emails; read-only tool access (searchLeads, email threads, live mailbox, Vault drafts, payments/booking summaries, approved URLs list).
- `/api/assistant/route.ts` returns `answer | recommendation | email_draft | email_batch`.
- `/api/assistant/context/route.ts` (GET): loads submissions/operations/backlog/calendar/inbound replies/sent emails/business goals via service client; auth via `x-diagnostic-admin-key` header or `key` query param.

### 3.4 Clients / strategy workspaces
- `lib/client-strategy.ts`: `CLIENT_STRATEGY_SERVICE_SLUGS = ['career-clarity','glow-up-vip']`, `CLIENT_CV_SERVICE_SLUGS = ['cv-revamp','cover-letter','linkedin','bundle']`, workspace views `['context','cv','prep','strategy']`, intake identity keys (fullName, email, phone, whatsapp, attendeePhoneNumber, attendeePhone, telephone), career-clarity intake order (cvNoted, notes, currentRole, skillStrength, clarityQuestion, clarityGoal, previousAttempts, alreadyTried, stuckScale, additionalInfo, additionalContext), `CLIENT_STRATEGY_REOPEN_WINDOW_DAYS = 30`.
- Access states: `active | recently-completed | archived | ineligible` with `daysRemaining`; CV services always active for CV analyzer; `getClientStrategyAccess` logic.
- Session debrief fields: `clarityShift`, `commitments`, `sensitivityNotes` (+ `interviewStoryEvidence` for glow-up-vip), 4000-char limit.
- Workspace href: `/resources/career-diagnostic/submissions?key=...&tab=career-tools&client=<paymentId>&view=<view>`.

### 3.5 Buying flow — `lib/buying-flow.ts`
- Services: `cv-revamp` R400, `cover-letter` R150, `linkedin` R300, `bundle` R500, `career-clarity` R800 (`checkoutAccess: 'accepted_booking'`), `glow-up-vip` R1200 (`accepted_booking`), `masterclass` (early bird R450 until `2026-06-07T21:00:00+02:00`, standard R500; session Saturday **4 July 2026 10:00–12:00 SAST**).
- `BookingSlug = 'discovery' | 'clarity' | 'glow-up'`; per-service intake fields (fullName/email/whatsapp/targetRole/currentRole/cvProblem; linkedinUrl/targetRoles/frustration/visibilityMode; jobDescription/whyYou).
- `/buy/[service]` page: `generateStaticParams` from `asyncServices`; supports `upgrade_token` (cv-revamp only, via `lib/upgrade-credits.ts`) and `booking_token` (via `lib/booking-payment.ts`); `paymentId = \`${service.slug}-${randomUUID()}\`` or booking-derived; checks existing `payments` row; `robots: noindex` when `checkoutAccess === 'accepted_booking'`.

### 3.6 Settings
- `lib/settings.ts` types: `SettingsMap`, `BusinessProfileSettings`, `BusinessHourBlock/ BusinessHoursSettings` (weekdays + saturday, sunday always null), `ServiceSetting` (name/slug/price/turnaround/active), `AiConfigSettings` (primary_model, secondary_model, model_provider 'zai'|'openrouter', zai_api_key, openrouter_api_key, openrouter_api_key_configured, test_mode, reasoning_enabled), `NotificationSettings` (new_lead, follow_up_due, lead_magnet_download, masterclass_reservation, overdue_delivery, payment_confirmed, intake_submitted, cal_booking, sent_email_log), `BusinessGoal` (id/title/horizon/category/metricLabel/currentValue/targetValue/deadline/priority/status/linkedArea/notes), `BusinessGoalsSettings`, `StoredEmailTemplate` (EmailTemplate + active/createdAt/updatedAt).
- Goal horizons: short_term|ninety_day|one_year|long_term; categories: clients|revenue|brand_visibility|social_growth|content|operations; statuses: not_started|active|at_risk|achieved|paused; linked areas: leads|pipeline|clients|finance|content|calendar|messages|tasks.
- Email templates from DB rows: template_id, archetype_name, subject, body, recommended_service, booking_key, source, download_key, variant, sequence_index, stage_label.

### 3.7 AI config
- `lib/ai-config.ts`: providers `zai | openrouter`; OpenRouter base `https://openrouter.ai/api/v1`; `REASONING_TOKEN_HEADROOM = 4000`; `buildAiRequestBody`, `resolveAiRuntimeConfig`.
- `lib/ai-models.ts`: `DEFAULT_OPENROUTER_PRIMARY_MODEL = 'z-ai/glm-5.2'`; options include `anthropic/claude-opus-5`, `x-ai/grok-4.6`, `moonshotai/kimi-k3`, `z-ai/glm-5.3`, `openai/gpt-5.6-sol`, `meta/muse-spark-1.2`; `requiresReasoning` + `supportsVision` flags; image requests fall back to a vision-capable model.
- `lib/openrouter-key-settings.ts`: hasConfiguredOpenRouterKey / mergeOpenRouterKeyForSave.

---

## 4. Integrations

| Integration | What it does | Key files / config |
|---|---|---|
| Supabase (Postgres) | All app data | `lib/supabase-server.ts` (service client), `lib/supabase.ts`, `@supabase/supabase-js ^2.105.1` |
| Brevo (Sendinblue) | Contact sync from lead intake | `BREVO_API_KEY`, `NEXT_PUBLIC_BREVO_LIST_ID` (list id `3` in .env.local), `lib/brevo/` |
| PayFast | Payments | `PAYMENT_PROVIDER`, `NEXT_PUBLIC_PAYFAST_MERCHANT_ID/KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_MODE`; `lib/payfast.ts`, `lib/payment-provider.ts`, `/api/payfast` |
| Peach Payments | **NOT IMPLEMENTED** — `app/api/peach/` contains only EMPTY placeholder dirs `checkout/`, `return/`, `webhook/` (no files). Migration `20260526180709_add_peach_payment_provider_fields.sql` adds provider fields. See gaps. | `app/api/peach/**` (empty) |
| Cal.com | Bookings (discovery/clarity/glow-up/masterclass) | `NEXT_PUBLIC_CAL_DISCOVERY_URL/CLARITY_URL/GLOW_UP_URL/MASTERCLASS_URL`, `CAL_WEBHOOK_SECRET`, `@calcom/embed-react ^1.5.3`, `/api/calendar/events`, `/api/webhooks` |
| Google Calendar | Read events | `GOOGLE_CLIENT_ID/SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_CALENDAR_ID=tebogo.shabangu3@gmail.com`, `/api/auth/google`, `/api/calendar/events` |
| Zoho Mail | Send + read inbound email | `ZOHO_MAIL_CLIENT_ID/SECRET/REFRESH_TOKEN`, `ZOHO_MAILBOX_EMAIL=hello@coachkagiso.co.za`, `ZOHO_ACCOUNTS_BASE_URL`, `ZOHO_MAIL_BASE_URL`, `ZOHO_AUTH_REDIRECT_URI`, `ZOHO_MAIL_ACCOUNT_ID`, `ZOHO_MAIL_INBOX_FOLDER_ID`; `/api/auth/zoho`, `/api/messages/import-inbound`, `/api/email/backlog/digest` |
| OpenRouter + ZAI | LLM providers | `ZAI_API_KEY`, OpenRouter key via settings; see 3.7 |
| Vercel | Hosting + cron | `vercel.json` (see Section 1) |
| Google OAuth | Dashboard session | `GOOGLE_CLIENT_ID/SECRET`, `/api/dashboard/session`, `security headers` in next.config.ts |

Env var names (values deliberately not recorded here): `PAYMENT_PROVIDER`, `NEXT_PUBLIC_PAYFAST_MERCHANT_ID`, `NEXT_PUBLIC_PAYFAST_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_MODE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, `NEXT_PUBLIC_BREVO_LIST_ID`, `ZAI_API_KEY`, `ZOHO_MAIL_CLIENT_ID`, `ZOHO_MAIL_CLIENT_SECRET`, `ZOHO_MAIL_REFRESH_TOKEN`, `ZOHO_MAILBOX_EMAIL`, `ZOHO_ACCOUNTS_BASE_URL`, `ZOHO_MAIL_BASE_URL`, `ZOHO_AUTH_REDIRECT_URI`, `ZOHO_MAIL_ACCOUNT_ID`, `ZOHO_MAIL_INBOX_FOLDER_ID`, `NEXT_PUBLIC_SITE_URL=https://coachkagiso.co.za`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CAL_DISCOVERY_URL`, `NEXT_PUBLIC_CAL_CLARITY_URL`, `NEXT_PUBLIC_CAL_GLOW_UP_URL`, `NEXT_PUBLIC_CAL_MASTERCLASS_URL`, `CAL_WEBHOOK_SECRET`, `BOOKING_PAYMENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_CALENDAR_ID`, `CRON_SECRET`, `DIAGNOSTIC_ADMIN_KEY`.

---

## 5. Design studio deep-dive (HIGHEST PRIORITY)

Component: `components/content/DesignStudioPanel.tsx` (~9562 lines). Launched from Content Studio "design" workspace; also reachable directly. Import from carousel/text flows via `openCarouselDraftInDesign` / `openGeneratedCarouselDraftInDesign` / `openGeneratedTextInDesign` in `ContentStudio.tsx` (lines 4227–4266) using `queueDesignStudioImport` + `setDesignImportRequest` + `activateWorkspace('design')`.

### 5.1 Canvas / dimensions / constants
- `DEFAULT_DESIGN_WIDTH = 1080`, `DEFAULT_DESIGN_HEIGHT = 1350` (4:5 portrait).
- `DEFAULT_SAFE_AREA_MARGIN = 90`, `DEFAULT_BLEED_MARGIN = 36`.
- `MIN_CANVAS_ZOOM` / `MAX_CANVAS_ZOOM`, `fitCanvasZoom()` sets 100; `setCanvasAspectRatio(w,h)` via `resizeDesignCanvas`; `invertCanvasAspectRatio()` swaps w/h.
- Formats: `designFormatOptions` (line 1766): `social_graphic | carousel | presentation`.
- Default design: `createDefaultManifestoDesign` (line 1824) — 1080×1350, background `#F5F2ED`, `paper_texture` asset layer, brand-top layer "COACH KAGISO" in `#B98567`.

### 5.2 Template slots
`brand | eyebrow | headline | body | cta | pageNumber | visualNote`.

### 5.3 Template persistence (localStorage only — no DB)
Storage keys:
- `coach-kagiso-design-studio-v3-manifesto` (current design autosave)
- `coach-kagiso-design-studio-v3-brand-assets`, `-v3-deleted-assets`, `-v3-hidden-assets`
- `coach-kagiso-design-studio-v1-templates` — `DesignTemplateRecord { id, name, format, width, height, sourceCarouselTemplate, sourceCarouselLayoutRecipe, document, createdAt, updatedAt }`. Saved via `saveCurrentDesignAsTemplate` (line 7016), loaded from localStorage (line 6387), persisted (line 6407). **There are NO built-in template records — templates are only what the user saves.**
- `coach-kagiso-design-studio-v1-pending-import`
- `coach-kagiso-design-studio-v1-content-vault-collapsed`

### 5.4 Asset library
Keyed by `DesignAssetId` — e.g. `/design-elements/manifesto/paper-texture.svg`, `/design-elements/paper-resources/*.svg`; supports `recolorable` and `textureRecolor` flags. Brand assets stored in localStorage (see keys above).

### 5.5 Carousel → Design import pipeline
- `getPreferredCarouselTemplateRecord` (line 6963) — picks saved template matching the carousel's template/layout recipe.
- `importCarouselDraft` (line 6977).
- `buildCarouselDesignPage` (line 2291): margin = `width * 0.078`; headline sizes = `height * 0.064` (cover) / `height * 0.052` (inner).
- `hydrateCarouselTemplatePage` (line 2520).
- `createDesignDocumentFromCarouselDraft` (line 2546): builds pages then resizes canvas via `resizeDesignCanvas`.

### 5.6 PNG export pipeline (this is the "design studio export" path)
Constants and helpers:
- `canvasToPngBlob` (line 3798): `canvas.toBlob(..., 'image/png')`.
- `waitForNextDesignPaint` (line 3964): double rAF.
- `preloadAllDesignFonts` (line ~3950): `document.fonts` ready + `.then(() => document.fonts.ready)`.
- `findExportCanvasForPage` (line 7820): queries `[data-design-export-stage="true"]` then `[data-page-id="..."]`.
- `exportPng` (line 7827): waits `waitForNextDesignPaint` → `preloadAllDesignFonts` → `waitForNextDesignPaint` → **350ms** setTimeout → `captureDesignCanvas` → `canvasToPngBlob` → `downloadBlob` named `` `${slugifyFileName(title)}-${pageName}`.png ``.
- `exportPdf` (line 7854): `jspdf`, px units, `hotfixes: ['px_scaling']`, orientation chosen from `width > height`.

`captureDesignCanvas` (line 3972) — core capture:
```ts
const exportHost = document.createElement('div');
// host: position:fixed; left:0; top:0; width/height = design.width/height;
// overflow:hidden; pointerEvents:none; zIndex:-1; opacity:0; visibility:visible
const exportElement = element.cloneNode(true) as HTMLElement;
// clone forced to exact design.width/height, boxSizing:border-box, margin:0,
// border:0, borderRadius:0, boxShadow:none, transform:none, transformOrigin:'top left'
document.body.append(exportHost);
await waitForDesignImages(exportElement);
await waitForDesignFonts(exportElement);
await prepareSvgMaskNodesForExport(exportElement);
const rootStyles = getComputedStyle(document.documentElement);
const fontSans = rootStyles.getPropertyValue('--font-sans').trim() || 'Raleway, Arial, sans-serif';
const fontSerif = rootStyles.getPropertyValue('--font-serif').trim() || 'Georgia, "Times New Roman", serif';
const canvas = await html2canvas(exportElement, {
  backgroundColor: null,
  logging: false,
  scale: 2,                       // <-- 2x supersample
  width: design.width,
  height: design.height,
  useCORS: true,
  windowWidth: window.innerWidth,
  windowHeight: window.innerHeight,
  scrollX: 0,
  scrollY: 0,
  onclone: (clonedDocument) => {
    // copies root className; forces --font-sans/--font-serif onto <html>;
    // pins clone to design.width/height; strips [data-design-guide],
    // [data-design-control], hides [data-design-text-measure];
    // optional transparentBackground: removes background + background-effects;
    // hides layers not in visibleLayerIds; boxShadow:none on [data-design-layer-id]
  },
});
exportHost.remove();
```
**Result: a 1080×1350 design exports as 2160×2700 PNG at full 2x resolution (no downscale).** PDF pages embed that canvas directly.

### 5.7 Carousel export pipeline (Content Studio — the "low-quality export" suspect)
In `components/content/ContentStudio.tsx`:
- `getCarouselExportDimensions` → from `carouselAspectRatioOptions` (`exportWidth`/`exportHeight` per option; e.g. portrait_4_5 → 1080×1350) — `lib/content/carousel-template-registry.ts:636`.
- `displayedExportDimensions = getCarouselExportDimensions(displayedAspectOption)` (line 10599).
- `getCarouselExportBaseName` (line 2324): `` `${title}-${aspectLabel}` ``.
- `getCarouselExportFontFamilies` (line 9976): reads CSS vars `--font-sans` / `--font-serif`, fallback `'Raleway, Arial, sans-serif'` / `'Georgia, "Times New Roman", serif'`.
- `waitForCarouselExportFonts` (line 9984): `document.fonts.ready`, collects up to 40 font requests (`weight size family`), loads, waits again.
- `captureCarouselSlideCanvas` (line 10005): the scale math:
```ts
const rect = element.getBoundingClientRect();
const layoutWidth = Math.max(1, Math.ceil(rect.width));
const layoutHeight = Math.max(1, Math.round(layoutWidth * (dimensions.height / dimensions.width)));
const baseScale = dimensions.width / layoutWidth;   // layout px -> target px
const scale = baseScale * 2;                        // 2x supersample
// host: position:fixed; left:-10000px; top:0; width: layoutWidth; height: layoutHeight;
// overflow:hidden; pointerEvents:none; zIndex:-1
// clone pinned to layoutWidth/layoutHeight; html2canvas({
//   backgroundColor:null, scale, width:layoutWidth, height:layoutHeight, useCORS:true,
//   onclone: copies root className, forces --font-sans/--font-serif,
//     injects style: [data-carousel-export-slide="true"] { font-family: sans !important; ... }
//     and .font-serif/h1/h2/h3 { font-family: serif !important; } })
// captured is ~2160px wide (layoutWidth * 2 * baseScale = 2 * dimensions.width)
if (captured.width !== dimensions.width || captured.height !== dimensions.height) {
  // resized canvas to dimensions.width/height with imageSmoothingEnabled = true
}
```
**Key difference vs design studio**: carousel export **always downscales to the platform target** (e.g. 1080×1350) after 2x supersampling; design studio PNG keeps full 2x (2160×2700). If slides look soft, the downscale + html2canvas SVG/background capture is the first place to look (see Section 13).
- `exportCarousel(mode)` (line 10664): loops slides via `exportSlideFrameRefs`, uses `displayedExportDimensions`, PNG via canvas.toBlob, PDF via jspdf (same px/hotfixes pattern), filenames via `getCarouselExportBaseName`.

### 5.8 Carousel template registry — `lib/content/carousel-template-registry.ts` (700 lines)
- `CarouselPlatform`: `linkedin | instagram_facebook | tiktok | email_voice`
- `CarouselSlideCount`: `auto | quick | full`
- `CarouselAspectRatio`: `auto | square_1_1 | portrait_4_5 | linkedin_document` (options carry `label`, `size`, `exportWidth`, `exportHeight`). `getCarouselAspectRatioOption` resolves `auto`: linkedin → `linkedin_document`, instagram_facebook → `portrait_4_5`, default → `linkedin_document`.
- `CarouselLayoutRecipe`: `authority_framework | guided_shift | diagnostic_reframe`
- `CarouselTemplate`: `editorial_authority | editorial_career_notes | warm_coaching | soft_diagnostic_cards | bold_diagnostic` (each with palette, `designDirection` tokens incl. `background/surface/ink/muted/accent/border`, `layoutRecipe`, `promptBehavior.generation`/`slideRules`, `preview`, `exportRules.pdf/png`).
- `CarouselSlideRole`: `cover | reframe | framework | step | proof | cta | mirror | checklist | reflection | diagnosis | myth | cost | rule`
- `CarouselComposition` (16): `editorial_cover, bold_claim, quiet_intro, quote_panel, contrast_block, note_card, numbered_stack, side_rail, card_grid, evidence_card, example_note, credibility_cue, soft_reflection, direct_action, save_share_close` (+1 more); `carouselCompositionsByRole` maps roles → allowed compositions; `getCarouselCompositionOptionsForRole`.
- `CarouselTemplatePalette`: `background / foreground / muted / accent / panel / border / chipBackground / chipText`.

---

## 6. Content creation

- System prompt: `lib/content/system-prompt.ts` — `buildSystemPrompt` (line 1914) with register rules: **CONVICTION REFRAME**, **CELEBRATION & GRATITUDE**, **THE CHALLENGER**, etc.
- Helpers: `lib/content/tools-ai.ts` (JSON tool extraction), `lib/content/humanizer.ts`, `lib/content/context.ts`, `lib/content/auto-topic.ts`, `lib/content/ai-limits.ts`, `lib/content/vault-*.ts`, `lib/content/carousel-template-registry.ts`, `lib/content/cv-extract.ts`.
- Content Studio constants — `lib/content-studio.ts`:
  - `contentPillars = ['career_growth','leadership','personal_brand','mentorship']`
  - `contentPlatforms = ['linkedin','tiktok','instagram','facebook','email']`
  - `contentCalendarStatuses = ['idea','draft','scheduled','published']`
  - `contentBacklogStatuses = ['idea','draft','in_progress','used']`
  - `contentBacklogSources = ['signal_brief','create','manual','insights','assistant','session_planner']`
  - `DashboardContext` shape: topArchetype, strongestTheme, leadsThisWeek, topService(+Count+ProjectedRevenue), hotLeadsCount, commonAnxieties.
- Content types (from `Content Studio - Full Reference.md` at repo root, verified accurate): linkedin_post, poll, content_series, myth-vs-fact, this-not-that, resource-roundup, faq, stats-data-story, before-after, career-journey, personal-brand-values, quotes-insights, plus platform-specific types for Instagram/TikTok/email.
- API routes: `/api/content/ai`, `/api/content/backlog`, `/api/content/calendar`, `/api/content/research`, `/api/content/smart-suggest`, `/api/content/transform` (`fetch-image`, `stage1`, `stage2`), `/api/content/vault-cleanup`.
- Manifesto series: `public/manifesto-series-prompt-pack.md` — "THE MANIFESTO SERIES: SEASON ONE", weekly **Reflection Friday** ritual; workflow: monthly idea bank → pick 4–5 → full post expansion; includes a brand context block for prompts.

---

## 7. Resume/CV analyser

- Route: `app/api/tools/cv-analyzer/route.ts` — goals `new_role | career_pivot | promotion | leadership_visibility | first_corporate_move | executive_positioning`; seniority `early | mid | senior | executive`; modes `simple | advanced`; `MAX_CV_CHARS = 60000`, `MAX_CONTEXT_CHARS = 16000`.
- Extraction: `lib/content/cv-extract.ts` — `pdfjs-dist` legacy worker via `pathToFileURL`, `MAX_CV_FILE_BYTES = 8MB`, pdf/docx/txt supported, **.doc (old binary) rejected**.
- Client-side CV store: `lib/client-cv-store.ts` (cv_file_name etc.), `lib/client-strategy-cv*.ts`.
- Report language rules: `lib/report-language-rules.ts` (`REPORT_EMPHASIS_RULES`, `REPORT_PLAIN_LANGUAGE_RULES`).
- Types/validation: `lib/cv-analyzer-types.ts`, `lib/cv-upload-validation.ts`.
- CV builder (deliverables): `app/api/tools/cv-builder/route.ts` — `deliverables = ['cv','cover_letter','linkedin']`, `MAX_ANALYSIS_CHARS = 8000`; generates .docx via `docx` lib; A4 geometry in twips: `PAGE_WIDTH = 11906`, `PAGE_HEIGHT = 16838`, `PAGE_MARGIN = 720`, `CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2`; `AlignmentType`, `BorderStyle`, `TabStopType` used; auth via `isDiagnosticAdminAuthorized`.

---

## 8. Lead magnets + follow-up templates

- Lead sources (normalized): diagnostic, cv-checklist, interview-prep (masterclass source removed from diagnostic + lead-magnet emails per commit 42c5646; migration `20260529113000_clear_masterclass_waitlist_auto_followups.sql` clears waitlist auto-followups).
- Email templates: stored in DB (`email_templates` rows: template_id, archetype_name, subject, body, recommended_service, booking_key, source, download_key, variant, sequence_index, stage_label — see `lib/settings.ts` `EmailTemplateRow`), plus `lib/email-templates.ts` defaults.
- Follow-up sequence: migration `20260517193407_add_follow_up_sequence.sql`; sequence repair status `20260529120258`; stage labels renamed `20260529150000_rename_email_template_stage_labels.sql`; scheduled sent-email status `20260529122058_add_scheduled_sent_email_status.sql`.
- Email backlog: `/api/email/backlog`, `/api/email/backlog/digest`, `/api/email/backlog/schedule`; sent-email log table (migrations `20260516105401_add_sent_emails_log.sql`, `20260525203000_extend_sent_emails_message_log.sql`, `20260525205336_add_inbound_email_replies.sql`).
- Notification events: `20260820090000_add_email_backlog_notification_event.sql`.

---

## 9. Data model

Supabase migrations (`supabase/migrations/`, 50 files — full list in Section 14). Headline tables (from migration names + code usage):
- `diagnostic_submissions` (lead records; archetype/status/source/lead-magnet fields; `updated_at`; archetype names normalized 20260529103000; RLS via `20260525185809_harden_dashboard_private_table_grants.sql`, `20260525185906_fix_dashboard_updated_at_search_path.sql`, `20260525185342_repair_dashboard_email_crm_schema.sql`).
- `payments` (+ `20260516130009_add_client_deliveries.sql`, `20260627120000_add_cv_checklist_lead_source.sql`, `20260627130000_add_interview_prep_lead_source.sql`).
- `sent_emails`, `inbound_email_replies`, `email_backlog`-related.
- `client_records` (manual engagements `20260719160000`), `client_deliveries`.
- `client_strategy_workspaces` (`20260719130000`), `client_strategy_plans` (`20260719140000`), `client_strategy_follow_up` (`20260719150000` + simplified `20260730110000`), `client_session_preparations` (`20260727200000`), `client_session_evidence` (`20260730090000`), `client_diagnostic_context_links` (`20260727220000`), `client_intake_overrides` (`20260727190000`), career tools CV storage (`20260727180000`), strategy plan export/delivery/fulfillment (`20260730120000`), plan horizon (`20260730100000`), session preparation edits (`20260729230000`), diagnostic coaching context consent (`20260727210000`), cal booking intake provenance (`20260719120000`), 48-hour CV review removed (`20260817100000`).
- `content_calendar_items`, `content_backlog_items`, `research_entries` (`20260517150041_add_content_studio.sql`, platform facebook `20260517161000`, sources insights/assistant/session_planner `20260518143000`/`20260523153000`/`20260526143000`).
- `dashboard_tasks`, `dashboard_notes` (`20260515211500`), `dashboard_notifications` (`20260524120148`), `dashboard_settings` (`20260520090000`).
- `webhook_logs` (`20260516063051`), `upgrade_credits` (`20260506153000`), `closed_lead_status` (`20260516103000`), `lead_source_sequences` (`20260524155827`), `follow_up_sequence` (`20260517193407`).
- `business_goals_settings` (`20260526190000`), assistant preferences/personality modes (`20260526143000`, `20260526165000`, `20260526173500`), peach provider fields (`20260526180709`).
- Auth tables: `20260517085404_add_google_auth.sql`.
- Exact per-table RLS policy rows: **not re-read** — see gaps (Section 15). All dashboard-facing tables are private (service-role only) per the hardening migrations.

---

## 10. Auth and users

- No public user accounts. Owners only.
- Dashboard auth options: diagnostic admin key (`DIAGNOSTIC_ADMIN_KEY`, header `x-diagnostic-admin-key` or `key` param) and/or Google OAuth dashboard session (`/api/auth/google`, `/api/dashboard/session`, logout at `/api/dashboard/session` route set; `lib/dashboard-session.ts`-style helpers; `DASHBOARD_SESSION_CLIENT_MARKER`).
- `AccessGate` component renders when `isDashboardServerAuthorized()` fails.
- Zoho OAuth for mail (refresh-token flow, not interactive).
- Booking/payment tokens: `lib/booking-payment.ts` (`getBookingPaymentId`, `getBookingPaymentSecret`, `verifyBookingPaymentToken`), `lib/upgrade-credits.ts`.
- API guards: `/api/assistant/context` and others check `isDiagnosticAdminAuthorized` / `x-diagnostic-admin-key`; crons use `CRON_SECRET`.

---

## 11. The website

Public pages (App Router):
- Marketing: home, work-with-me, about, thanks (+ `app/JsonLd.tsx` for FAQ/JSON-LD schema).
- `/buy/[service]` (static generation for all `asyncServices`; metadata + canonical + OG; `robots: noindex` for booking-gated services).
- `/book` with Cal.com embeds.
- Career diagnostic: `app/resources/career-diagnostic` (multi-step form) + submissions dashboard host (Section 3.1).
- Lead magnets (CV checklist, interview prep) with their own intake/lead-source paths.
- Masterclass page (early-bird + session date 4 July 2026).
- Shared components: `Navbar`, `Footer`, `Reveal`, `PageFaq`, `PaymentBranding`, `JsonLd`.
- Styling: Tailwind 4 (`@import "tailwindcss"` in `app/globals.css`); brand tokens + `coach-dashboard-clean` overrides in globals.css.

---

## 12. Brand implementation audit

**Brand spec (intended)** — from `public/brand` assets / brand spec:
- Colors: Dark Gunmetal `#142334`; Rodeo Dust `#C9AD98`; Chai `#E4D8CB`; Latte `#A09086`; White; Froth `#E8E3DF`; Creme `#CDC6C3`.
- Typography: **Inter** body, **Playfair Display** headings, **Northwell** signature-only. Dark Gunmetal is the only primary CTA color. No brush/script headlines.

**Actual implementation (audited deviations)**:
- Public site + dashboard use **Raleway**, **Noto Serif Display**, **Poppins**, and hand/script fonts in places.
- Design Studio exposes many script/hand font options; default manifesto design uses `#B98567` (not in the spec palette) on `#F5F2ED` background (also not in palette).
- Dashboard clean theme maps borders to Latte `#A09086`/Chai `#E4D8CB`, backgrounds `#EDEBE8`/`#F5F3EE` — warm off-spec neutrals.
- CSS vars `--font-sans`/`--font-serif` drive exports (fallbacks hardcode Raleway/Georgia).
- Conclusion: brand tokens exist in multiple places (globals.css, DesignStudioPanel palette constants, registry `designDirection.tokens`) and are not unified — this is the branding cleanup work.

---

## 13. Known issues / tech debt

1. **Carousel export softness (the reported bug)**: `captureCarouselSlideCanvas` always downscales the 2x supersampled capture to platform target dims (e.g. 1080×1350) with `imageSmoothingEnabled=true`, while Design Studio PNG keeps full 2x (2160×2700). Combined with html2canvas SVG/text rendering, exported carousel frames can look softer than design-studio exports. Audit: downscale path, `backgroundColor: null` transparency, CSS var font forcing in `onclone`, 40-font request cap in `waitForCarouselExportFonts`.
2. **Brand/font deviation**: see Section 12 — fonts/colors drift from spec; export fallbacks hardcode Raleway/Georgia.
3. **`app/api/peach/**` is empty placeholder directories** (`checkout`, `return`, `webhook`) — payment provider abstraction exists (`lib/payment-provider.ts`), PayFast is the live provider; Peach is scaffolded (migration `20260526180709` adds fields) but **not implemented**. 
4. `.doc` (legacy Word) files rejected by CV extractor — only .docx supported.
5. Clean-dashboard CSS uses `!important` global overrides (`box-shadow: none !important`, border transparency) — the Phase 1 fix scoped them via `:not(.growth-os-assistant *)` (globals.css:183–191); any new component inside the dashboard can still be flattened unless excluded.
6. Masterclass early-bird deadline `2026-06-07T21:00:00+02:00` and session date 4 July 2026 are in the past/future depending on today (2026-08-20: session has passed) — pricing/booking copy needs a refresh each season.
7. Design Studio templates are localStorage-only; no cross-device sync; a cleared browser loses saved templates/brand assets.
8. Dashboard is one giant server page (2654 lines) + giant client components (ContentStudio 14k+ lines, DesignStudioPanel 9.5k lines) — heavy, hard to test.

---

## 14. Quick-reference file map

```
package.json / next.config.ts / vercel.json / tsconfig.json / postcss.config.*
app/globals.css                      # brand tokens + coach-dashboard-clean overrides
app/(marketing)/                     # home, work-with-me, about, thanks pages
app/buy/[service]/page.tsx           # checkout (static params, tokens)
app/book/                            # Cal.com bookings
app/resources/career-diagnostic/     # diagnostic form
app/resources/career-diagnostic/submissions/page.tsx   # DASHBOARD HOST
app/api/...                          # see Section 4 + 3.6 (assistant, auth, calendar,
                                     #  clients/*, contact, content/*, dashboard/*,
                                     #  diagnostic/*, email/*, messages/*, payfast,
                                     #  peach(empty), tools/*, webhooks)
components/DashboardSidebar.tsx
components/assistant/GrowthOSAssistant.tsx
components/content/ContentStudio.tsx         # 14,255 lines (carousel export inside)
components/content/DesignStudioPanel.tsx     # 9,562 lines (design export inside)
components/content/CarouselStudioPanel.tsx   # carousel workspace
components/payment/PaymentBranding.tsx
components/Navbar.tsx Footer.tsx Reveal.tsx PageFaq.tsx JsonLd.tsx (app/JsonLd.tsx)
lib/ai-config.ts  lib/ai-models.ts  lib/openrouter-key-settings.ts
lib/settings.ts  lib/assistant-preferences.ts  lib/growth-os-assistant.ts
lib/buying-flow.ts  lib/payment-provider.ts  lib/payfast.ts  lib/booking-payment.ts  lib/upgrade-credits.ts
lib/client-strategy.ts  lib/client-strategy-cv*.ts  lib/client-cv-store.ts
lib/client-operations.ts  lib/diagnostic-submissions.ts  lib/supabase-server.ts  lib/supabase.ts
lib/content-studio.ts  lib/content/system-prompt.ts  lib/content/tools-ai.ts  lib/content/humanizer.ts
lib/content/context.ts  lib/content/auto-topic.ts  lib/content/ai-limits.ts  lib/content/vault-*.ts
lib/content/cv-extract.ts  lib/content/carousel-template-registry.ts
lib/email-templates.ts  lib/brevo/  lib/env.ts
public/manifesto-series-prompt-pack.md
public/design-elements/manifesto/*.svg  public/design-elements/paper-resources/*.svg
supabase/migrations/ (50 files — see Section 9; notable:
  20260517085404_add_google_auth.sql
  20260517150041_add_content_studio.sql
  20260517193407_add_follow_up_sequence.sql
  20260525185342_repair_dashboard_email_crm_schema.sql
  20260525185809_harden_dashboard_private_table_grants.sql
  20260526180709_add_peach_payment_provider_fields.sql
  2026071913-2026071916 client strategy workspaces/plans/follow-up/manual engagements
  2026072718-2026082009 career tools, session prep/evidence, exports)
tests/ (34 files; run: node --experimental-strip-types --test tests/*.test.mjs)
scripts/build_pitch_pdf.py  scripts/publish-diagnostic-playbooks.mjs  scripts/sync-email-templates.mjs
Content Studio - Full Reference.md   # repo root, verified accurate
KNOWLEDGE_TRANSFER.md                 # this file
```

---

## 15. Questions / gaps to resolve before further work

1. **Peach Payments**: are the empty `app/api/peach/{checkout,return,webhook}` dirs scaffolding for a future provider, or leftovers to delete? Live payment is PayFast via `lib/payment-provider.ts`.
2. **Exact RLS policy rows per table** — migration list is captured, but the precise per-table policies were not re-read. Read `supabase/migrations/20260525185809_harden_dashboard_private_table_grants.sql` (+ 20260525185342, 20260525185906) before any schema change.
3. **Full assistant system prompt** (lines 728–850 of `lib/growth-os-assistant.ts`) was summarized (personality + SERVICES block quoted exactly); the full tool/URL allow-list should be read verbatim before modifying assistant behavior.
4. **Carousel export quality fix** needs a decision: keep downscale-to-target (platform-correct file size) but improve render quality (e.g. drop `imageSmoothingEnabled`, increase supersample, fix font loading), or export full 2x like Design Studio? Confirm which artifacts users call "low quality" (LinkedIn PDF pages vs PNG frames).
5. **Brand unification**: which token source is canonical — `globals.css`, Design Studio palette constants, or registry `designDirection.tokens`? The spec palette (Section 12) differs from actual; decide whether to converge on spec or formalize actual.
6. `.doc` support: intentional rejection or a gap?
7. Masterclass dates: past session (4 July 2026) — needs a new season/date or removal from pricing pages.
8. Business-goals/`settings` tables and the `dashboard_settings` JSON bundle: exact shape of `SettingsMap` keys not fully enumerated (see `lib/settings.ts` — read lines 121–449 for the full save/load mapping before editing settings UI).
9. Whether "design studio" branding work should also restyle default manifesto design (`#F5F2ED`/`#B98567` non-spec values) toward the brand palette.