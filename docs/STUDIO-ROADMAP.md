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
| 7 | Design Studio export drift + blur | 1 | Next |
| 2 | Design template gallery | 2 | Planned |
| 6 | Save-as-template, incl. CTA kind | 2 | Planned |
| 4 | Fidelity loss on "Open in Design Studio" | 2 | Planned (resolves via 2 + 6) |
| 5 | Custom CTA slide | 2 | Planned (needs 6) |
| 9 | Design Studio layout shell | 2 | Planned |
| 10 | Carousel DNA extraction from uploaded PDF | 3 | Planned |
| 8 | Remove image background | 3 | Planned |

Tier 1 = correctness and daily relief. Tier 2 = the template/document model.
Tier 3 = new capability.

---

## Changelog

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

**Design Studio export clips at the viewport.** `captureDesignCanvas` passes
`windowWidth: window.innerWidth, windowHeight: window.innerHeight` while the
export host sits at `position: fixed; left: 0; top: 0` at full design size. When
the design is taller than the browser viewport, html2canvas clips it. The
carousel lane avoids this by parking its host at `left: -10000px` and passing
`scrollWidth`. Note: this is *not* caused by the zoom level of the visible
canvas — export renders from a separate hidden full-size stage.

**Design Studio export drifts on rotated layers.** Layers render via
`transform: rotate(${layer.rotation}deg)`. Partial CSS-transform support is
html2canvas's best-known failure mode, which is why rotated elements land in the
wrong place. The durable fix is to stop rasterising: the layer model is already a
vector scene graph, so it can render to SVG and then to PDF.

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
