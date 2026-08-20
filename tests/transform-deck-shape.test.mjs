import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDeckShapeSection, buildTemplateRequestSection } from '../lib/content/transform-deck-shape.ts';
import { CAROUSEL_SLIDE_ROLES } from '../lib/content/carousel-template-registry.ts';

test('a text post carries no deck shape, so Stage 2 sees nothing extra', () => {
  assert.equal(buildDeckShapeSection({}), '');
  assert.equal(buildDeckShapeSection({ visualPattern: 'bold headers' }), '');
});

test('a carousel replays its arc one numbered role per slide', () => {
  const section = buildDeckShapeSection({
    slideCount: 9,
    slideArc: ['cover', 'step', 'step', 'cost', 'step', 'step', 'step', 'reframe', 'cta'],
    layoutRecipe: 'authority_framework',
    copyDensity: 'medium',
  });

  assert.match(section, /Source slide count: 9/);
  assert.match(section, /Closest layout recipe: authority_framework/);
  assert.match(section, /1\. cover/);
  assert.match(section, /4\. cost/);
  assert.match(section, /8\. reframe/);
  assert.match(section, /9\. cta/);
  assert.match(section, /Copy density on inner slides: medium/);
});

test('each arc role is explained, so the model reads a shape not a token list', () => {
  const section = buildDeckShapeSection({ slideCount: 2, slideArc: ['cover', 'cost'] });
  assert.match(section, /cover - the opening slide that carries the hook/);
  assert.match(section, /cost - what the mistake costs/);
});

test('every registry role renders with a gloss', () => {
  const section = buildDeckShapeSection({
    slideCount: CAROUSEL_SLIDE_ROLES.length,
    slideArc: [...CAROUSEL_SLIDE_ROLES],
  });
  for (const role of CAROUSEL_SLIDE_ROLES) {
    assert.match(section, new RegExp(`${role} - \\w`), `role "${role}" rendered without a gloss`);
  }
});

test('slide count is guidance, not an instruction that beats the format limits', () => {
  const section = buildDeckShapeSection({ slideCount: 12 });
  assert.match(section, /where the format's own slide limits allow/);
});

test('a non-carousel rebuild is told to treat the arc as order, not slides', () => {
  const section = buildDeckShapeSection({ slideCount: 5, slideArc: ['cover', 'step', 'cta'] });
  assert.match(section, /use the arc as the order of ideas rather than as slides/);
});

test('an unknown role still renders rather than vanishing from the arc', () => {
  // Stage 1 coerces unknown roles, but Stage 2 must not silently drop a slide
  // if anything ever reaches it unrecognised.
  const section = buildDeckShapeSection({ slideCount: 2, slideArc: ['cover', 'insight'] });
  assert.match(section, /2\. insight/);
});

test('mechanism fields reach the rebuild prompt', () => {
  const section = buildDeckShapeSection({
    slideCount: 9,
    slideArc: ['cover', 'step', 'cta'],
    hookTechnique: 'Consensus Bias -> Information Gap',
    intraSlideLoop: ['Principle', 'Bold rule', 'Punchline'],
    pacing: { sentence: '4-12 words', breath: 'Double break', close: 'Under 6 words' },
    valueMethod: 'Deconstructed swipe file.',
    ctaLayers: ['Share - low effort', 'Follow - humour disarms'],
    emotionalArc: { start: 'Frustrated', middle: 'Capable', end: 'Included' },
  });

  assert.match(section, /Consensus Bias -> Information Gap/);
  assert.match(section, /Principle -> Bold rule -> Punchline/);
  assert.match(section, /Sentence: 4-12 words/);
  assert.match(section, /1\. Share - low effort/);
  assert.match(section, /Frustrated -> Capable -> Included/);
});

test('the rebuild is reminded it never saw the source', () => {
  const section = buildDeckShapeSection({ slideCount: 3, slideArc: ['cover', 'step', 'cta'] });
  assert.match(section, /you have never seen the source/);
});

test('a text post asks for no template', () => {
  assert.equal(buildTemplateRequestSection({}), '');
  assert.equal(buildTemplateRequestSection({ valueMethod: 'anything' }), '');
});

test('a deck asks for a bracketed mould after the finished piece', () => {
  const section = buildTemplateRequestSection({ slideCount: 9, slideArc: ['cover', 'step', 'cta'] });
  assert.match(section, /--- REUSABLE TEMPLATE ---/);
  assert.match(section, /square-bracket placeholder/);
  assert.match(section, /no sentence from any source deck/);
});
