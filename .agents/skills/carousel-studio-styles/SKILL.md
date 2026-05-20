---
name: carousel-studio-styles
description: Add, revise, or apply Coach Kagiso Carousel Studio visual templates. Use when working on carousel template metadata, HTML/CSS slide rendering, aspect-ratio behavior, carousel preview styling, or export-ready slide design in the coach-kagiso app.
---

# Carousel Studio Styles

## Purpose

Use this skill when shaping Carousel Studio visuals. The goal is a reusable slide styling system, not one-off decorative designs.

Carousel Studio combines:

- Structured carousel draft data in `CarouselDraftPayload`.
- Aspect ratio settings from `lib/content/carousel-template-registry.ts`.
- Visual template metadata from `lib/content/carousel-template-registry.ts`.
- Layout recipes, prompt behavior, preview metadata, and export rules from the same registry.
- Independent Visual style and Story structure controls in Create and Carousel Studio.
- HTML/CSS rendering in `CarouselSlideFrame`.
- Composition Engine v1: slide role + composition + text-fit selection.
- Deck Quality Check: local export-readiness scoring for density, rhythm, CTA strength, and composition repetition.
- Deck Fix Actions: local, save-backed fixes for selected QA findings.
- Session undo and restore controls around deck fix actions.
- The template selector in `CarouselTemplateSelector`.
- Slide editing in `CarouselDraftEditor`.
- Export capture from the rendered slide frames for PDF and PNG output.

## Current Templates

- `editorial_authority`: refined LinkedIn authority decks. Quiet, high-trust, editorial hierarchy.
- `warm_coaching`: softer Instagram/Facebook relationship posts. Human, warm, reassuring.
- `bold_diagnostic`: sharp reframes, hooks, myths, diagnostic content. High contrast and decisive.

## Template Contract

Each template must include:

- `value`: stable snake_case id.
- `label`: UI label.
- `bestFor`: short use case.
- `description`: one sentence explaining the visual logic.
- `palette`: background, foreground, muted, accent, panel, border, chip background, chip text.
- `designDirection`: mood, typography, posture, and brand tokens.
- `layoutRecipe`: the slide arc and allowed slide roles.
- Templates can carry a default `layoutRecipe`, but saved drafts and UI controls should treat `template` and `layoutRecipe` as separate settings.
- `promptBehavior`: generation rules and slide rules for the AI prompt.
- `preview`: sample copy for the empty Carousel Studio state.
- `exportRules`: PDF and PNG constraints.

Every saved carousel draft should carry:

- `aspectRatio`
- `template`
- `layoutRecipe`
- `slides`, with each slide carrying a `role` from the selected layout recipe and a `composition` override, usually `auto`
- `caption`
- `coverDesign`

## Implementation Pattern

When adding a template:

1. Add the id to `CarouselTemplate`.
2. Add the metadata object to `carouselTemplateOptions` in `lib/content/carousel-template-registry.ts`.
3. Check `CarouselSlideFrame` for any template-specific layout condition.
4. Make sure `normalizeStoredCarouselDraft` can keep old drafts working.
5. Verify the selector, saved draft, and rendered slides still agree.

When adding a layout recipe:

1. Add the id to `CarouselLayoutRecipe`.
2. Add the recipe to `carouselLayoutRecipeOptions`.
3. Optionally attach the recipe as a default to one or more templates.
4. Confirm `buildCarouselTemplatePromptBlock` gives the AI the selected slide arc.
5. Confirm old drafts fall back to the selected template's recipe when no saved `layoutRecipe` exists.
6. Confirm generated and saved slides carry roles that match the selected recipe.

When changing compositions:

1. Add the id to `CarouselComposition` in `lib/content/carousel-template-registry.ts`.
2. Add user-facing metadata to `carouselCompositionOptions`.
3. Attach the composition to the relevant roles in `carouselCompositionsByRole`.
4. Update `resolveCarouselComposition` and `CarouselSlideFrame` when the new composition needs distinct layout behavior.
5. Keep `auto` as the default so old drafts and generated drafts remain stable.

When changing deck quality checks:

1. Keep checks local and deterministic first; do not add AI calls unless the user asks for a creative-director pass.
2. Review cover length, slide density, role rhythm, CTA clarity, proof presence, and repeated compositions.
3. Keep QA advisory; it should guide editing, not rewrite slides automatically.
4. Surface slide-specific findings with the slide number when possible.
5. Do not block export from QA warnings unless the user explicitly asks for hard gates.

When changing deck fix actions:

1. Keep first-pass fixes deterministic and local; use AI only for explicit rewrite/creative-director actions.
2. Route fixes through the saved draft path so the backlog JSON and formatted content stay in sync.
3. Prefer safe structural fixes: set role, set composition, split slide, add missing proof/teaching/reframe slide, strengthen CTA, or rebalance repeated compositions.
4. Do not silently delete user copy. Split or move content instead of dropping it.
5. Keep fix buttons advisory; the user should still be able to ignore warnings and export.

When changing draft history / undo:

1. Keep undo session-based unless the user explicitly asks for database-level versioning.
2. Capture the previous draft before any quality fix saves.
3. Undo and restore must route through the same saved draft path as regular editor saves.
4. Reset the history when the active saved draft changes.
5. Do not create hidden automatic rewrites; history should protect user control.

When changing the editor:

1. Preserve the saved draft payload shape.
2. Keep edits local until the user clicks Save.
3. PATCH the backlog item with both updated `content` and JSON `notes`.
4. Keep the minimum of 4 slides and maximum of 10 slides unless the carousel strategy changes.
5. Do not make the editor rewrite copy automatically; it should only apply user edits.

When changing export behavior:

1. Export the hidden full-size `CarouselSlideFrame` lane instead of capturing the small sidebar preview.
2. Keep the selected aspect ratio as the source of truth for export dimensions.
3. PDF export should preserve one slide per page for LinkedIn document carousels.
4. PNG export should create one frame per slide for Instagram/Facebook carousel posting.
5. Make export errors visible in the Carousel Studio panel instead of failing silently.
6. Wait for `document.fonts.ready`, preserve the Next font CSS variables, and keep serif/sans font families explicit in the html2canvas clone.
7. Keep preview and export on the same component contract; use scaled export dimensions, not a separate visual design.

## Visual Guardrails

- Keep cards and slide frames at `rounded-[8px]`.
- Respect the selected aspect ratio through CSS `aspect-ratio`.
- Use Coach Kagiso brand colors as the base: ink `#142334`, warm accent `#C9AD98`, soft surfaces `#F8F6F4` / `#FBFAF8`.
- Do not use purple gradients, decorative orbs, or generic SaaS illustration styling.
- Keep slide text readable at preview size. Avoid tiny body copy and overcrowded frames.
- A carousel template should affect visual hierarchy, color, and mood; it should not rewrite the slide content.

## Checks

Run after template or renderer edits:

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

Use the browser on `?tab=content&studio=carousel` to confirm:

- Output frame selector is visible.
- Visual style selector is visible.
- Story structure selector is visible.
- Changing Visual style does not overwrite the saved Story structure.
- Rendered slides change when selecting different templates.
- Existing saved carousel drafts still render.
- Saved carousel drafts can be selected explicitly from the draft list.
- Slide edits can be saved, and the rendered preview reads the updated saved draft.
- Slide roles can be edited, and role-specific layouts render differently.
- Slide composition can be left on Auto fit or overridden per slide.
- Deck quality panel appears for saved drafts and reports export readiness before PDF/PNG export.
- Deck quality findings can offer local fix actions that save back to the active draft.
- Undo last fix and Restore original appear in the deck quality panel after local fix actions are available.
- PDF and PNG export buttons appear when a saved carousel draft exists.
- Exported slides visually retain the Coach Kagiso serif/sans font pairing.
