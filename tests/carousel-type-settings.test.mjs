import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CAROUSEL_TYPE_LIMITS,
  carouselEditorialMetrics,
  layoutEditorialAuthoritySlide,
} from '../lib/content/carousel-editorial-layout.ts';
import { countWrappedLines, measureEm } from '../lib/content/carousel-type-fit.ts';

const PAGE = { width: 1080, height: 1350 };
const SHORT = { headline: 'You are not behind.', body: 'One supporting line.' };

test('tracking is measured, not applied on top of the measurement', () => {
  // A line set wide is wider. A fit that ignored that would wrap it late and
  // clip it in the export while the preview still looked right.
  const plain = measureEm('performance', 'poppins');
  const tracked = measureEm('performance', 'poppins', false, 0.1);
  assert.ok(tracked > plain, 'tracking has to add width');
  assert.equal(Math.round((tracked - plain) * 100) / 100, 1.1, 'one em per character, at 0.1em across 11');

  const text = 'Only one of these signs is about performance today';
  assert.equal(countWrappedLines(text, 40, 460, 'poppins'), 3);
  assert.equal(countWrappedLines(text, 40, 460, 'poppins', 0.12), 4, 'tracked wide, the same copy needs another line');
});

test('a size step moves the ceiling and nothing else', () => {
  const base = layoutEditorialAuthoritySlide({ ...SHORT, ...PAGE });
  const bigger = layoutEditorialAuthoritySlide({ ...SHORT, headlineType: { sizeStep: 2 }, ...PAGE });
  const smaller = layoutEditorialAuthoritySlide({ ...SHORT, headlineType: { sizeStep: -2 }, ...PAGE });

  assert.equal(base.headlineSize, carouselEditorialMetrics.headlineMax);
  assert.equal(bigger.headlineSize, base.headlineSize + 2 * CAROUSEL_TYPE_LIMITS.sizeStep);
  assert.equal(smaller.headlineSize, base.headlineSize - 2 * CAROUSEL_TYPE_LIMITS.sizeStep);
});

test('the fit still protects the band when the step asks for too much', () => {
  // This is the whole point of adjusting the ceiling rather than replacing the
  // size: a slide can be tuned and still cannot clip.
  const long = {
    headline: 'A headline long enough that it could never sit at the largest size this control offers.'.repeat(6),
    body: '',
  };
  const asked = carouselEditorialMetrics.headlineMax + 3 * CAROUSEL_TYPE_LIMITS.sizeStep;
  const layout = layoutEditorialAuthoritySlide({ ...long, headlineType: { sizeStep: 3 }, ...PAGE });

  assert.ok(layout.headlineSize < asked, `asked for ${asked}, and the copy still came down to ${layout.headlineSize}`);
  assert.ok(layout.groupHeight <= layout.bandHeight, 'and it still fits the band');
});

test('a step never drives the size under the floor', () => {
  const layout = layoutEditorialAuthoritySlide({ ...SHORT, headlineType: { sizeStep: -3 }, ...PAGE });
  assert.ok(layout.headlineSize >= carouselEditorialMetrics.headlineMin);
});

test('settings outside the control are clamped rather than trusted', () => {
  // A stored draft can carry anything; the layout is the place that decides.
  const wild = layoutEditorialAuthoritySlide({
    ...SHORT,
    headlineType: { sizeStep: 99, tracking: 5, leading: 0 },
    bodyType: { tracking: -9, leading: 40 },
    ...PAGE,
  });

  assert.equal(wild.headlineTracking, CAROUSEL_TYPE_LIMITS.maxTracking);
  assert.equal(wild.headlineLeading, CAROUSEL_TYPE_LIMITS.minLeading);
  assert.equal(wild.bodyTracking, CAROUSEL_TYPE_LIMITS.minTracking);
  assert.equal(wild.bodyLeading, CAROUSEL_TYPE_LIMITS.maxLeading);
  assert.ok(wild.groupHeight <= wild.bandHeight, 'and the slide still fits');
});

test('unset settings fall back to the template defaults', () => {
  const layout = layoutEditorialAuthoritySlide({ ...SHORT, ...PAGE });
  assert.equal(layout.headlineTracking, 0);
  assert.equal(layout.headlineLeading, carouselEditorialMetrics.headlineLineHeight);
  assert.equal(layout.bodyLeading, carouselEditorialMetrics.bodyLineHeight);
});

test('looser leading makes the block taller, and the fit accounts for it', () => {
  const tight = layoutEditorialAuthoritySlide({ ...SHORT, bodyType: { leading: 1.2 }, ...PAGE });
  const loose = layoutEditorialAuthoritySlide({ ...SHORT, bodyType: { leading: 1.9 }, ...PAGE });

  assert.ok(loose.bodyHeight > tight.bodyHeight);
  assert.ok(loose.groupHeight <= loose.bandHeight);
});
