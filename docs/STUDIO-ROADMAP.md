# Studio Roadmap — Content / Carousel / Design

Live tracking document for the Content Studio, Carousel Studio and Design Studio
integration work. **Update this file in the same commit as the change it
describes.** If the log and the code disagree, the code is right and the log is a
bug.

Last updated: 2026-08-20

---

## The core problem

The three studios are a **pipeline** (Create → Carousel → Design → export) when
the work needs a **document**: one record holding copy, structure, design and
caption, with three views editing it.

Almost every defect below is a symptom of that mismatch:

- Nothing returns from Design Studio — `importCarouselDraft` calls
  `replaceDesignDocument` and the result carries no reference to the backlog item
  it came from.
- ~~Design Studio holds exactly one design, in `localStorage`, on one browser.~~
  Fixed 2026-08-20: designs are rows in `design_documents`, and more than one
  can exist at a time.
- Three renderers draw the same slide: `CarouselSlideFrame` (HTML → PNG),
  `CarouselPdfDocument` (react-pdf vector), and Design Studio's layer canvas.
  Each has its own layout maths, so a fix in one does not reach the others.

---

## Status board

| # | Item | Tier | Status |
|---|---|---|---|
| 1 | PNG/PDF export quality | 1 | **Done** |
| 3 | Export selected slides only | 1 | **Done** |
| 7 | Design Studio export drift + blur | 1 | **Mostly done** — see caveat |
| 6 | Save-as-template, incl. CTA kind | 2 | **Done** |
| 5 | Custom CTA slide | 2 | **Done** |
| 2 | Design template gallery | 2 | Partial — kinds, filter, badges and Supabase storage shipped; thumbnails outstanding |
| 4 | Fidelity loss on "Open in Design Studio" | 2 | **Done** |
| 9 | Design Studio layout shell | 2 | **Done** |
| 10 | Carousel DNA extraction from uploaded PDF | 3 | **Done** — migration pending |
| 8 | Remove image background | 3 | Next |

Tier 1 = correctness and daily relief. Tier 2 = the template/document model.
Tier 3 = new capability.

---

## Changelog

### 2026-08-20 — Carousel DNA, built on Transform (item 10)

Kagiso pushed back on building this standalone, and he was right. Stage 1 was
already a structural extractor with vision, OCR, and an explicit "NEVER
reproduce the source wording" guardrail. A carousel is the same job across N
slides, so this extends Transform rather than sitting beside it — roughly a
third of the originally planned work, with no new AI route, upload path, or
vision plumbing.

**How it works.** A third input type (Text / Image / **Carousel PDF**).
`lib/content/carousel-pdf-reader.ts` renders the deck to page images in the
browser — server-side rasterising would need `node-canvas`, a heavy native
dependency, and the multipart upload already existed. Capped at 12 pages,
~1000px, white-filled so transparent pages do not rasterise black. Stage 1 OCRs
each slide, then reads the arc from the assembled deck: keeping structure
extraction a *text* call means no model has to hold twelve images at once.

The carousel schema extends the existing framework with `slideCount`,
`slideArc`, `layoutRecipe`, `copyDensity`, `visualPattern` and
`whatMakesItWork`. The arc and recipe use the vocabulary from
`carousel-template-registry`, so the DNA reads back into the generator rather
than being a report to retype.

Analysed decks are saved to a new `carousel_dna` table and can be reloaded into
Stage 2 without re-uploading. Its own table on purpose: vault items fall through
to `ideas`, which is hard deleted after 60 days.

**A pre-existing bug this uncovered.** `extractTextFromImage` only used the
pinned GLM vision models when the provider is `zai`. On OpenRouter it used
`runtime.model` unconditionally, so OCR against a text-only configured model
(currently `deepseek-v4-flash`) failed with *"No endpoints found that support
image input"*. That broke the **existing screenshot upload**, not just
carousels. It now uses the vision-capable fallback the catalogue already
provides, the same way `tools-ai.ts` does.

**Verified** against a real 9-slide LinkedIn deck — 200 in 63s:

| Field | Value |
|---|---|
| slideArc | cover → reframe ×3 → framework → step ×2 → proof → cta |
| layoutRecipe | `guided_shift` |
| copyDensity | `medium` |

Exactly nine entries in order, valid registry values, no source wording
reproduced. The PDF reader was verified separately on an 8-page deck (8 pages,
~44KB per JPEG).

**Outstanding:** the `carousel_dna` migration needs applying. Suggested angles
from a reference were not built — Stage 2 already rebuilds from a framework, so
that path works today; a dedicated angle list would be an addition, not a gap.

**Known limitation:** pdf.js rendering relies on `requestAnimationFrame`, which
does not fire while the tab is hidden. Switching tabs mid-render stalls it until
you return. Same class as the Design Studio export hang fixed in `e1386f0`, but
it recovers on its own rather than hanging forever.

### 2026-08-20 — The working design moved to Supabase

Design Studio kept exactly one design in localStorage under
`coach-kagiso-design-studio-v3-manifesto`: one browser, no second device, and a
cleared site wiped the work. It also meant importing a second carousel replaced
the first outright with no way back.

Designs are now rows in `design_documents`. Save writes to Supabase and mirrors
locally, so an unreachable API cannot cost work — the message says plainly when
only the local copy was written. A **Saved designs** list opens or deletes
previous work. Listing uses a summary query that omits the `document` column,
since a full design carries every page and layer and the list never renders it.

**The safety property.** `replaceDesignDocument` and
`replaceImportedDesignDocument` both clear `currentDesignId`, so opening a
template, starting blank, or importing a carousel creates a *new* record on the
next Save rather than overwriting what was open. Reset detaches too — it starts
a new design rather than deleting the stored one. Deleting the open design
clears the id rather than leaving it pointing at a row that is gone.

**A race found during verification.** Loading the saved design is async, and a
pending carousel import applies almost immediately on mount — so the in-flight
fetch resolved afterwards and replaced the freshly imported deck with the last
saved design. After importing a 9-slide deck and saving, the row still held the
previous `social_graphic` design. Both replace paths now set
`documentClaimedRef`, and the loader refuses to apply a document once anything
has claimed the canvas.

Also memoised `selectSingleLayer`. As a plain function it changed identity every
render, which would have made the new loading effect refetch the design list on
*every* render.

Verified against the live table: save creates a row and re-saving updates it
rather than duplicating; importing a carousel keeps the 9-page deck and saves as
a second row with both designs coexisting; reload restores the latest design
from Supabase with the list populated.

Still local-only: brand assets (`BRAND_ASSETS_STORAGE_KEY`) and the deleted-asset
list.

### 2026-08-20 — Canvas room: a real fit, and focus mode (item 9)

**"Fit" was never a fit.** `fitCanvasZoom()` was `setCanvasZoom(100)` — it reset
to the exact zoom that overflows the column. The button that should have solved
the cramped canvas was causing it. It now measures the canvas viewport and
solves for the zoom that fits.

It fits to **width**, not to the whole artboard. Fitting height as well landed
around 51% on a portrait frame, smaller than the 60–65% that was being set by
hand — and the column scrolls vertically anyway. The problem being solved is
horizontal.

**The canvas column had no floor.** Between 1280px and 1535px the grid was two
columns with the right panel spanning both, leaving the canvas at
`minmax(0, 1.1fr)`. It now holds `minmax(560px, 1.4fr)` at `xl` and
`minmax(620px, 1.5fr)` at `2xl`, with the side columns trimmed to pay for it.

**Focus mode** hides both side columns, drops the shell to one column and
re-fits. The canvas also re-fits when the frame size changes.

Verified at 1577px: panels visible → canvas column 620px, auto-fit 54%, artboard
renders 583px wide *inside* a 620px column, so nothing is clipped. Focus on →
column 1301px, auto-fit 117%. Toggling back restores both panels and 54%.

Not attempted: the full Canva shell (icon rail, panels sliding over the canvas,
floating contextual toolbar). That is a large restructure of a 9,600-line
component, and these three changes remove the daily friction. Worth revisiting
only if the panels still feel in the way.

Reminder: working zoom never affected exports. They render from a separate
hidden full-size stage — the cut-off was the PDF page/image mismatch fixed in
76afa1e.

### 2026-08-20 — Templates on Supabase, and one shared slide geometry (items 2 and 4)

**Templates moved off localStorage.** New `design_templates` table holding the
DesignDocument as jsonb, a `/api/content/design-templates` route behind the
existing dashboard auth, and a browser client that uploads anything still in
localStorage exactly once before clearing the local copy. If an upload fails the
local records stay visible and the client stays in fallback mode, so templates
never vanish from the UI.

One migration consequence worth knowing: local ids were self-generated and
Postgres assigns its own, so a carousel draft referencing a pre-migration CTA
template shows the "no longer in Design Studio" warning and needs re-picking
once. This only affects templates that existed before the migration ran.

**One geometry for all lanes (item 4).** `buildCarouselDesignPage` was a second,
independent layout implementation, which is why an imported deck did not look
like the preview:

| | Importer (before) | Preview |
|---|---|---|
| margin | `width * 0.078` = 84px | 40 units = 72px |
| headline | `height * 0.064` = 86px | type scale = 110px |
| body / CTA | fixed fractions of the canvas | flowed column |
| composition | never resolved | resolved, drives the type scale |

Geometry and sizing now live in `carousel-template-registry.ts`:
`CAROUSEL_PREVIEW_BASE_WIDTH` plus `carouselLayoutMetrics` hold the preview
baseline, and `getCarouselSlideBodyPoints`, `getCarouselSlideTextStats`,
`resolveCarouselComposition` and `getCarouselHeadlineSize` moved out of
ContentStudio so both files call the same functions rather than copies.
`getCarouselResolvedHeadlineSize` captures the cover bump the preview applied
inline and the importer did not — the reason covers landed a step small.

Verified on a real deck: preview headline 61px, imported design 110px
(61 x 1.8), against 86px before.

Note this aligns the **preview and Design Studio**. The vector PDF keeps its own
tuned page padding (96/140) on purpose, since it was deliberately set in
228c95e. Unifying that lane is a separate decision, not an accident to fix.

### 2026-08-20 — Template kinds and the custom CTA slide (items 6 and 5)

**Templates now declare what they are for.** `DesignTemplateKind` is
`'deck' | 'cover' | 'cta'`. Save-as-template replaced `window.prompt` with a
dialog, since a prompt can only ever return a string and a template now needs a
kind as well as a name. Templates saved before this change have no `kind` and
normalise to `'deck'`, which is what they all were.

Carousel import now considers **deck-kind templates only**. Without that filter a
single-slide CTA or cover template could be picked to skin an entire imported
deck and stretched across every slide.

**The custom CTA slide** is designed once in Design Studio, saved as a `cta`
template, and chosen per deck in Carousel Studio.
`customCtaTemplateId`/`customCtaTemplateName` ride on the draft and survive the
vault round-trip; the AI never sets them. On import the template's page is
resized to the deck's frame and appended as the final page, on both the hydrated
and synthesized paths.

`DesignStudioPanel` exports `readDesignCtaTemplateSummaries()` as the single
doorway into template storage, so Carousel Studio never learns where templates
live. When those move to Supabase, only that file changes.

**Honest limitation, surfaced in the UI:** Carousel Studio's own PDF/PNG export
stays at the deck slide count. The CTA is a `DesignDocument`, and Carousel Studio
renders through `CarouselSlideFrame` and `CarouselPdfDocument` — different
renderers. To get the CTA in the file you export from Design Studio. The picker
says so directly rather than silently dropping a slide. This is the same
three-renderer problem as item 4, and it resolves the same way.

Verified end to end: the choice persists to the backlog row in Supabase, and
opening a 9-slide deck in Design Studio produces 10 pages ending in
`Slide 10 - Follow CTA - Masterclass`.

### 2026-08-20 — Design Studio export fidelity (item 7)

Three separate root causes, all in `components/content/DesignStudioPanel.tsx`.

**The PDF cut-off was a page/image size mismatch, not the zoom level.**

`exportPdf` created the document with `format: [design.width, design.height]`
(1x) and then drew every image at the *canvas* size, which is `pixelScale` times
larger. On page 1 that painted a 2160x2700 bitmap onto a 1080x1350 page anchored
top-left, so the exported PDF showed only the **top-left quarter** of the design.
Pages 2+ were then added at the canvas size, so page dimensions were inconsistent
within one document as well.

Pages now stay at the design size throughout, and the image is drawn to fill
exactly that box — the bitmap keeps its extra pixels, so it is oversampled into
the page instead of cropped by it.

Worth noting: this is unrelated to the zoom level of the visible canvas. Export
has always rendered from a separate hidden full-size stage, never from the canvas
you are looking at.

**Elements moved because recoloured SVG assets were forced back into flow.**

`applySvgMaskExportToNode` ended with
`node.style.position = node.style.position || 'relative'`. Recoloured SVG asset
nodes are positioned by class (`absolute inset-0`), not inline style, so
`node.style.position` read empty for every one of them and the fallback fired.
Forcing `position: relative` pulled the node out of absolute positioning and back
into normal flow, where an empty box collapses to zero height. That is why
exported assets landed in the wrong place or changed size.

It now reads the *computed* position and only falls back to `relative` when the
node is genuinely `static`. The same fix also removes a measurement mismatch: the
child's background geometry was calculated from `offsetWidth`/`offsetHeight`
measured *before* the node was collapsed by that very line.

**Viewport clipping hardened.**

The export host sat at `position: fixed; left: 0; top: 0` — inside the visible
viewport — while html2canvas rendered through a window sized by
`windowWidth`/`windowHeight` taken from `window.innerWidth`/`innerHeight`. Any
design taller than the browser window could be clipped. The host now sits at
`left: -100000px` and the render window is at least the design size plus margin,
mirroring the carousel lane, which has never had this problem.

**Blur: export resolution is now a choice.**

`scale: 2` was hardcoded with no way to raise it. Added `DesignExportScale`
(1 | 2 | 3) with a control next to the export buttons, defaulting to 2x. Export
messages now report the actual pixel dimensions produced, and PNG filenames carry
the scale. Added `releaseDesignExportCanvas` and freed each canvas after its
bytes reach a blob or the PDF.

**Export hung forever in a background tab.**

`waitForNextDesignPaint` awaited two `requestAnimationFrame` callbacks, which do
not fire while `document.visibilityState === 'hidden'`. Switching to another tab
part-way through an export left the pipeline waiting on a frame that would never
arrive: the UI sat on "Preparing 1-page PDF export..." with no error and no way
out. The frame is now raced against a 250ms timeout. Found while verifying the
export in a backgrounded browser tab.

**Verified end to end** against real exported files, not just the UI's own
success messages:

| Check | Result |
|---|---|
| Carousel PNG at 2x | 2160x2700 on disk (a pre-fix export from the same deck measured 1080x1350) |
| Carousel PDF is vector | 5 embedded TrueType subsets (Inter x4, Playfair Display), 0 image XObjects |
| Single-slide export | produced `-slide-03@2x.png` and `-slide-03.pdf`, numbered by original position |
| Design PDF page size | MediaBox `0 0 810 1012.5` pt = exactly 1080x1350 px |
| Design PDF image fit | content stream draws `810 0 0 1012.5 0 0 cm` — fills the page exactly, with a 2160x2700 bitmap inside it |

Pre-fix, that last draw would have been 1620x2025 pt on an 810x1012.5 pt page —
exactly 2x overflow, which is the top-left-quarter crop.

**Not verified visually:** the recoloured-SVG asset position fix. It needs a
design containing a textured or mask-recoloured asset, exported and eyeballed
against the canvas.

**Caveat — rotation drift is not fully solved.**

Layers apply `transform: rotate()` on the bounds wrapper and, when flipped,
`scaleX(-1)` / `scaleY(-1)` on the content child. Nested transforms are a known
html2canvas weakness, so a layer that is *both rotated and flipped* may still
render slightly off. The position fix above resolves the far more common case
(assets moving or resizing), but the durable answer is to stop rasterising
entirely: the layer model is already a vector scene graph and can render to SVG
and then to true vector PDF. That is its own piece of work — the main unknown is
text wrapping, since SVG has no automatic line breaking and lines would have to
be measured and emitted as `tspan`s.

### 2026-08-20 — Export resolution and per-slide export (items 1 and 3)

**Item 1 — PNG resolution was capped at 1080px.**

Root cause: `captureCarouselSlideCanvas` oversampled to 4x the layout width
(~4320px for a LinkedIn frame) and then, in its final block, resampled the result
back down to exactly `dimensions.width x dimensions.height`. Every PNG ever
exported from Carousel Studio was 1080x1350 regardless of the oversampling. The
comment above the capture claimed the opposite of what the code below it did.

Changes in `components/content/ContentStudio.tsx`:

- Added `CarouselExportScale` (1 | 2 | 3), `carouselExportScaleOptions` and
  `DEFAULT_CAROUSEL_EXPORT_SCALE` (2x).
- `captureCarouselSlideCanvas` now takes `pixelScale`, targets
  `dimensions * pixelScale`, and asks html2canvas for exactly that scale. It only
  resamples when html2canvas misses the target (sub-pixel rounding), and never
  resamples down to the 1x frame.
- Added `releaseCarouselExportCanvas`. A 3x LinkedIn frame is 3240x4050
  (~52MB RGBA); a ten-slide deck held at once would crash the tab. Every export
  path now frees each canvas as soon as its bytes reach a blob or the PDF.
- The PNG path captures, downloads and frees one frame at a time instead of
  collecting every canvas first.
- Filenames carry the scale: `...-slide-03@2x.png`.

**Item 1 — the silent raster PDF fallback.**

Carousel Studio's PDF is vector (`@react-pdf`), and the brand fonts are present
in `public/fonts/`. But if the vector render threw, the code fell back to a
raster PDF and only wrote a `console.warn` — a soft PDF was indistinguishable
from a sharp one from the outside. The fallback now reports itself in the UI,
with the underlying error, at `tone: 'error'`. The raster fallback also honours
the chosen pixel scale, so the embedded bitmap is oversampled rather than
stretched.

**Item 3 — export selected slides only.**

- `selectedExportIndexes` (a `Set` of positions in `renderedDeck`) with All /
  None controls and a numbered chip per slide.
- The selection resets to the full deck whenever the active draft or the slide
  count changes, so a stale index can never point past the end of a shorter deck.
- Both lanes honour the selection: PDF builds pages only for selected slides,
  PNG exports only those frames.
- The original slide number travels with each entry, so exporting slide 3 alone
  still produces `-slide-03@2x.png`, not `-slide-01`.
- Partial exports get a filename suffix (`-slide-03` for one, `-4-slides` for
  several). Export buttons show the count and disable at zero selected.

Verified: `npx tsc --noEmit` clean, `npx next build` succeeds, `npm test` 209/209
passing.

---

## Known bugs not yet fixed

Recorded here so they are not rediscovered from scratch.

**`CAROUSEL_PDF_PAGE` is hardcoded to 1080x1350** in
`components/content/CarouselPdfDocument.tsx`. Choosing a square or portrait
aspect ratio still produces a 1350-tall vector PDF page. The PNG lane honours the
selected ratio correctly; only the vector PDF ignores it.

**Rotated *and* flipped layers may still drift on export.** See the item 7
caveat in the changelog. Nested CSS transforms (rotate on the bounds wrapper,
scale(-1) on the content child) are a known html2canvas weakness. Resolved
properly by the vector renderer, not by more raster patching.

**Carousel drafts are auto-deleted after 60 days.** `getVaultSectionForItem`
(`lib/content/vault-policy.ts`) has no case for `carousel_draft`, so finished
decks fall through to `'ideas'` — 60-day retention, hard-deleted by
`pruneExpiredVaultItems` on the next backlog write. They also consume one of the
60 idea slots, and a full Idea Backlog returns 409 and blocks saving a new
carousel.

**Two concepts share one variable.** `createSelection.carouselTemplate` is both
"default for the next generate" and gets overwritten by whichever draft was last
edited in Carousel Studio (`saveCarouselDraftRecord`). Separately, every
`selectCarousel*` handler calls `setGeneratedCarouselDraft(null)`, so changing
the aspect ratio after generating discards the draft.

**No AI past step one.** One AI call site exists in the whole 14k-line file.
Carousel Studio's deck fixes are deterministic string operations; Design Studio
has none. At the moment you can *see* a headline overflow, the only remedy is to
return to Create and regenerate the entire deck.

---

## Notes for the next session

`components/content/ContentStudio.tsx` is ~14,500 lines and holds all four
workspaces. `DesignStudioPanel.tsx` is ~9,600. Splitting them is not cosmetic —
it is why each fix above costs more than it should.

The one genuinely shared contract is
`lib/content/carousel-template-registry.ts` (aspect ratios, 6 templates, 4 layout
recipes, slide roles, compositions, palettes, export dimensions). Both studios
import it. Keep new shared vocabulary there; it is also what makes item 10
feasible, since the model can map a competitor's deck onto an existing taxonomy
rather than inventing one.
