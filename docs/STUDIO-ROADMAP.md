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
- Design Studio holds exactly one design, in `localStorage`, on one browser
  (`DESIGN_STORAGE_KEY`). The content half is in Supabase.
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
| 2 | Design template gallery | 2 | Partial — kinds, filter and badges shipped; thumbnails and Supabase storage outstanding |
| 4 | Fidelity loss on "Open in Design Studio" | 2 | Next |
| 9 | Design Studio layout shell | 2 | Planned |
| 10 | Carousel DNA extraction from uploaded PDF | 3 | Planned |
| 8 | Remove image background | 3 | Planned |

Tier 1 = correctness and daily relief. Tier 2 = the template/document model.
Tier 3 = new capability.

---

## Changelog

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
