import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normaliseCarouselFramework,
  normaliseFramework,
} from '../lib/content/carousel-framework.ts';

const base = {
  hookPattern: 'Opens by stacking a consensus claim then invalidating it.',
  emotionalTension: 'Frustration at advice that stops short of application.',
  storyStructure: 'Gap, then numbered principles, then a layered close.',
  ctaStyle: 'Asks for a share, a follow, and a re-read.',
  formatLogic: 'One principle per slide keeps each swipe cheap.',
  suggestedPillar: 'Personal Brand & Visibility',
};

test('the flat field names the rest of the app reads are preserved', () => {
  const f = normaliseCarouselFramework({ ...base, slideArc: ['cover'] }, 1);
  for (const key of Object.keys(base)) {
    assert.equal(typeof f[key], 'string', `${key} must stay a top-level string`);
    assert.ok(f[key].length > 0, `${key} must not be blank`);
  }
});

test('a nested extraction blanks out rather than half-working', () => {
  // Guards the shape a rival draft proposed: meta/specStrip/mechanics wrappers.
  const f = normaliseCarouselFramework({ specStrip: base, meta: { slideCount: 9 } }, 9);
  assert.equal(f.hookPattern, '');
  assert.equal(f.storyStructure, '');
});

test('mechanism fields survive normalisation', () => {
  const f = normaliseCarouselFramework({
    ...base,
    slideArc: ['cover', 'step'],
    hookTechnique: 'Consensus Bias -> Information Gap',
    intraSlideLoop: ['Principle', 'Bold rule', 'Micro-example'],
    pacing: { sentence: '4-12 words', breath: 'Double break', close: 'Under 6 words' },
    valueMethod: 'Deconstructed swipe file.',
    ctaLayers: ['Share - low effort', 'Follow - humour disarms'],
    emotionalArc: { start: 'Frustrated', middle: 'Capable', end: 'Included' },
  }, 2);

  assert.equal(f.hookTechnique, 'Consensus Bias -> Information Gap');
  assert.deepEqual(f.intraSlideLoop, ['Principle', 'Bold rule', 'Micro-example']);
  assert.equal(f.pacing.sentence, '4-12 words');
  assert.equal(f.ctaLayers.length, 2);
  assert.equal(f.emotionalArc.end, 'Included');
});

test('missing mechanism fields become empty, never undefined', () => {
  const f = normaliseCarouselFramework({ ...base, slideArc: ['cover'] }, 1);
  assert.deepEqual(f.intraSlideLoop, []);
  assert.deepEqual(f.ctaLayers, []);
  assert.deepEqual(f.pacing, { sentence: '', breath: '', close: '' });
  assert.deepEqual(f.emotionalArc, { start: '', middle: '', end: '' });
});

test('a model returning a string where a list belongs does not crash', () => {
  const f = normaliseCarouselFramework(
    { ...base, slideArc: ['cover'], intraSlideLoop: 'Principle then rule', ctaLayers: null },
    1,
  );
  assert.deepEqual(f.intraSlideLoop, []);
  assert.deepEqual(f.ctaLayers, []);
});

test('runaway lists are capped so they cannot blow up the Stage 2 prompt', () => {
  const f = normaliseCarouselFramework(
    { ...base, slideArc: ['cover'], intraSlideLoop: Array(40).fill('beat'), ctaLayers: Array(40).fill('layer') },
    1,
  );
  assert.equal(f.intraSlideLoop.length, 8);
  assert.equal(f.ctaLayers.length, 5);
});

test('invalid enums blank rather than passing through', () => {
  const f = normaliseCarouselFramework(
    { ...base, slideArc: ['cover'], layoutRecipe: 'Listicle + Deconstruction', copyDensity: 'medium - 15-20 words' },
    1,
  );
  assert.equal(f.layoutRecipe, '');
  assert.equal(f.copyDensity, '');
});

test('valid enums pass, including capitalised model output', () => {
  const f = normaliseCarouselFramework(
    { ...base, slideArc: ['Cover'], layoutRecipe: 'Authority_Framework', copyDensity: 'Medium' },
    1,
  );
  assert.equal(f.layoutRecipe, 'authority_framework');
  assert.equal(f.copyDensity, 'medium');
  assert.deepEqual(f.slideArc, ['cover']);
});

test('an unknown role is reported and coerced, keeping the arc positional', () => {
  const seen = [];
  const f = normaliseCarouselFramework(
    { ...base, slideArc: ['cover', 'insight', 'cta'] },
    3,
    (role) => seen.push(role),
  );
  assert.deepEqual(f.slideArc, ['cover', 'step', 'cta']);
  assert.deepEqual(seen, ['insight']);
  assert.equal(f.slideArc.length, 3, 'arc must stay one entry per slide');
});

test('normaliseFramework defaults hasExtractableStructure to true', () => {
  assert.equal(normaliseFramework({}).hasExtractableStructure, true);
  assert.equal(normaliseFramework({ hasExtractableStructure: false }).hasExtractableStructure, false);
});
