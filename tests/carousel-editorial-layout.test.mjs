import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CAROUSEL_EDITORIAL_BASE_WIDTH,
  CAROUSEL_EDITORIAL_WORDMARK,
  carouselEditorialMetrics,
  layoutEditorialAuthoritySlide,
} from '../lib/content/carousel-editorial-layout.ts';
import {
  countWrappedLines,
  fitTypeSize,
  measureEm,
  splitBoldRuns,
} from '../lib/content/carousel-type-fit.ts';
import { carouselTemplateOptions } from '../lib/content/carousel-template-registry.ts';

const PAGE = { width: 1080, height: 1350 };

// A constant rather than an escape: a literal newline inside a string here
// does not survive every editing path, and breaks the parser when it does not.
const NEWLINE = String.fromCharCode(10);

/** The slide from the reference card, verbatim. */
const REFERENCE_HEADLINE =
  'Only one of these signs is about **performance**. The other two are about **visibility and intention**.\nThat is the part most career advice misses.';

test('every template declares the face it sets type in', () => {
  for (const option of carouselTemplateOptions) {
    assert.ok(
      ['inter', 'playfair', 'poppins'].includes(option.typeface),
      `${option.value} has no valid typeface`,
    );
  }
  const editorial = carouselTemplateOptions.find((option) => option.value === 'editorial_authority');
  assert.equal(editorial.typeface, 'poppins');
});

test('bold runs are measured as bold, not as plain text', () => {
  // A fit that ignored the markers would under-measure every headline built on
  // the reference look, which is bolded key phrases inside regular type.
  const plain = measureEm('performance', 'poppins', false);
  const bold = measureEm('performance', 'poppins', true);
  assert.ok(bold > plain, 'bold must measure wider than regular');

  const runs = splitBoldRuns('a **b** c');
  assert.deepEqual(
    runs.map((run) => [run.text, run.bold]),
    [['a ', false], ['b', true], [' c', false]],
  );
});

test('the markers themselves never reach the measured text', () => {
  const withMarkers = countWrappedLines('one **two** three', 40, 400, 'poppins');
  const without = countWrappedLines('one two three', 40, 400, 'poppins');
  assert.equal(withMarkers, without, 'asterisks must not be measured as glyphs');
});

test('a word split across a style boundary wraps as one word', () => {
  // "cer" + bold "tainty" is one word. Measured as two it could wrap mid-word,
  // which no renderer would actually do.
  const narrow = measureEm('certainty', 'poppins') * 20;
  const lines = countWrappedLines('**cer**tainty', 20, narrow + 1, 'poppins');
  assert.equal(lines, 1);
});

test("the author's newlines survive the fit as hard breaks", () => {
  const lines = countWrappedLines('one\ntwo', 20, 10_000, 'poppins');
  assert.equal(lines, 2, 'a very wide box must still break where the author did');
});

test('the fit shrinks rather than overflowing', () => {
  const box = { maxWidth: 888, maxHeight: 300, lineHeight: 1.28, typeface: 'poppins', min: 20, max: 64 };
  const short = fitTypeSize({ ...box, text: 'Short line.' });
  const long = fitTypeSize({
    ...box,
    text: 'A far longer headline that has to wrap across several lines before it is done saying what it came to say.',
  });

  assert.equal(short, box.max, 'copy that fits keeps the largest size');
  assert.ok(long < short, 'longer copy must come down a size');
  assert.ok(
    countWrappedLines('A far longer headline that has to wrap across several lines before it is done saying what it came to say.', long, box.maxWidth, 'poppins') *
      long *
      box.lineHeight <=
      box.maxHeight,
    'the fitted block must actually fit',
  );
});

test('the fit never returns something smaller than the floor', () => {
  const size = fitTypeSize({
    text: 'word '.repeat(400),
    maxWidth: 888,
    maxHeight: 200,
    lineHeight: 1.28,
    typeface: 'poppins',
    min: 24,
    max: 64,
  });
  assert.equal(size, 24, 'past a point the copy needs cutting, not shrinking');
});

test('the reference headline fits the band it was designed for', () => {
  const layout = layoutEditorialAuthoritySlide({
    headline: REFERENCE_HEADLINE,
    body: '',
    ...PAGE,
  });

  assert.equal(layout.scale, 1, 'the PDF renders in base space');
  assert.equal(layout.headlineSize, carouselEditorialMetrics.headlineMax, 'copy this length still sets at the design size');
  assert.equal(layout.headlineLines, 5, 'the reference card sets on five lines');
  assert.ok(layout.groupHeight <= layout.bandHeight, 'the group must fit between the pinned rows');
  assert.equal(layout.overflows, false);
});

test('the headline holds its size until the copy stops fitting, then comes down', () => {
  const short = layoutEditorialAuthoritySlide({ headline: 'You are not behind.', body: '', ...PAGE });
  const reference = layoutEditorialAuthoritySlide({ headline: REFERENCE_HEADLINE, body: '', ...PAGE });
  const overlong = layoutEditorialAuthoritySlide({
    headline: `${REFERENCE_HEADLINE} ${REFERENCE_HEADLINE} ${REFERENCE_HEADLINE} ${REFERENCE_HEADLINE}`,
    body: '',
    ...PAGE,
  });

  // A deck whose headline size tracked the free space would change size on
  // every slide, so ordinary copy all sets at the same size.
  assert.equal(short.headlineSize, reference.headlineSize, 'ordinary copy sets at one size');
  assert.ok(overlong.headlineSize < reference.headlineSize, 'copy that no longer fits comes down');
  assert.ok(reference.groupHeight > short.groupHeight, 'more copy still means a taller group');
  for (const layout of [short, reference, overlong]) {
    assert.ok(layout.groupHeight <= layout.bandHeight, 'none may overrun the band');
  }
});

test('a cover is allowed a larger headline than an inner slide', () => {
  const inner = layoutEditorialAuthoritySlide({ headline: 'You are not behind.', body: '', ...PAGE });
  const cover = layoutEditorialAuthoritySlide({ headline: 'You are not behind.', body: '', isCover: true, ...PAGE });

  assert.equal(inner.headlineSize, carouselEditorialMetrics.headlineMax);
  assert.equal(cover.headlineSize, carouselEditorialMetrics.coverHeadlineMax);
});

test('a long body gives space back to the headline instead of pushing it out', () => {
  // The body is fitted first against a capped share of the band. If it needs
  // more than that and there is room, it may take it - but only what the
  // headline did not use, and never past the floor either of them will set at.
  const layout = layoutEditorialAuthoritySlide({
    headline: 'A headline that still has to be readable.',
    body: 'A deliberately long supporting paragraph. '.repeat(14),
    ...PAGE,
  });

  assert.ok(layout.headlineSize >= carouselEditorialMetrics.headlineMin);
  assert.ok(layout.bodySize >= carouselEditorialMetrics.bodyMin);
  assert.ok(layout.groupHeight <= layout.bandHeight, 'the group still fits the band');
  assert.equal(layout.overflows, false);
});

test('copy that cannot fit at all is reported rather than silently clipped', () => {
  const layout = layoutEditorialAuthoritySlide({
    headline: 'A headline that still has to be readable.',
    body: 'A deliberately enormous body. '.repeat(200),
    ...PAGE,
  });

  assert.equal(layout.bodySize, carouselEditorialMetrics.bodyMin, 'the body is already as small as it goes');
  assert.equal(layout.overflows, true);
});

test('a list is what the author put on separate lines, and none of it is dropped', () => {
  // The registry's body-point helper caps its output and strips full stops,
  // which is right for a card grid and would silently shorten an exported
  // slide here.
  const lines = ['One.', 'Two.', 'Three.', 'Four.', 'Five.', 'Six.', 'Seven.'];
  const list = layoutEditorialAuthoritySlide({ headline: 'Signs.', body: lines.join(NEWLINE), ...PAGE });

  assert.equal(list.bodyAsList, true);
  assert.deepEqual(list.bodyPoints, lines, 'every line survives, punctuation included');

  const paragraph = layoutEditorialAuthoritySlide({
    headline: 'Signs.',
    body: 'One sentence. Then a second one. And a third for good measure.',
    ...PAGE,
  });
  assert.equal(paragraph.bodyAsList, false, 'sentences are not a list');
  assert.equal(paragraph.bodyPoints.length, 1);
});

test('the gap between list lines is part of the measured height', () => {
  // Without it the fit measures a block shorter than the one it draws, and a
  // list that "fits" runs into the footer.
  const lines = ['One.', 'Two.', 'Three.', 'Four.'];
  const layout = layoutEditorialAuthoritySlide({ headline: 'Signs.', body: lines.join(NEWLINE), ...PAGE });
  const bare = layout.bodyLines * layout.bodySize * carouselEditorialMetrics.bodyLineHeight;

  assert.equal(
    Math.round(layout.bodyHeight - bare),
    (lines.length - 1) * carouselEditorialMetrics.bodyItemGap,
  );
});

test('the preview and the export resolve the same slide', () => {
  // The two lanes differ only by scale. If they ever disagree on a base-space
  // number, the PNG and the PDF stop being the same design - which is exactly
  // what happened when each lane carried its own margins.
  const preview = layoutEditorialAuthoritySlide({ headline: REFERENCE_HEADLINE, body: 'A short supporting line.', width: 600, height: 750 });
  const exported = layoutEditorialAuthoritySlide({ headline: REFERENCE_HEADLINE, body: 'A short supporting line.', ...PAGE });

  assert.equal(preview.scale, 600 / CAROUSEL_EDITORIAL_BASE_WIDTH);
  for (const key of ['headlineSize', 'bodySize', 'headlineLines', 'bodyLines', 'bandHeight', 'padX', 'padTop']) {
    assert.equal(preview[key], exported[key], `${key} must not depend on the render width`);
  }
});

test('a square slide gets a shorter band than a portrait one', () => {
  const portrait = layoutEditorialAuthoritySlide({ headline: REFERENCE_HEADLINE, body: '', ...PAGE });
  const square = layoutEditorialAuthoritySlide({ headline: REFERENCE_HEADLINE, body: '', width: 1080, height: 1080 });

  assert.ok(square.bandHeight < portrait.bandHeight);
  assert.ok(square.headlineSize <= portrait.headlineSize, 'less room means no larger type');
});

test('empty copy does not produce a broken layout', () => {
  const layout = layoutEditorialAuthoritySlide({ headline: '', body: '', ...PAGE });
  assert.equal(layout.bodySize, 0);
  assert.equal(layout.bodyLines, 0);
  assert.equal(layout.overflows, false);
  assert.ok(layout.groupHeight > 0, 'the avatar row still occupies the group');
});

test('the wordmark splits without changing what it spells', () => {
  // It is drawn as two runs so COACH can sit lighter than KAGISO. If the split
  // ever drifts from the furniture string, the slide quietly says something
  // other than the brand name.
  const joined = CAROUSEL_EDITORIAL_WORDMARK.light + CAROUSEL_EDITORIAL_WORDMARK.bold;
  const editorial = carouselTemplateOptions.find((option) => option.value === 'editorial_authority');
  assert.equal(joined, editorial.furniture.wordmark);
  assert.ok(
    carouselEditorialMetrics.wordmarkBoldWeight > carouselEditorialMetrics.wordmarkLightWeight,
    'the second half has to be the heavier one',
  );
});

test('the identity block carries its own line height', () => {
  // Without one the preview inherits the app's (around 1.5, which pushes the
  // handle half a line clear of the name) while react-pdf applies a different
  // default - the same block rendering two different shapes.
  const m = carouselEditorialMetrics;
  assert.equal(typeof m.identityLineHeight, 'number');
  assert.ok(m.identityLineHeight < 1.3, 'the name and handle read as one signature');

  // And the reserved row height has to be measured with that leading and with
  // both sizes - the handle sets a step larger than the wordmark above it - or
  // the group is sized against a block other than the one drawn.
  assert.ok(m.handleFontSize > m.identityFontSize, 'the handle is the larger of the two');
  const layout = layoutEditorialAuthoritySlide({ headline: 'Short.', body: '', ...PAGE });
  const textHeight = (m.identityFontSize + m.handleFontSize) * m.identityLineHeight + m.identityLineGap;
  assert.equal(layout.avatarRowHeight, Math.max(m.avatarSize, textHeight));
  assert.equal(layout.avatarRowHeight, m.avatarSize, 'the avatar is the taller of the two');
});

test('the footer band is as tall as the swipe hand, not the type beside it', () => {
  // The hand is the taller of the two. Reserving only the line box left the
  // wordmark and SWIPE aligned on an edge rather than on one line, and left the
  // band that many points short.
  const m = carouselEditorialMetrics;
  const layout = layoutEditorialAuthoritySlide({ headline: 'Short.', body: '', ...PAGE });

  assert.ok(m.swipeIconSize > m.footerFontSize * m.footerLineHeight, 'the hand is the taller item');
  assert.equal(layout.footerHeight, m.swipeIconSize);
});

test('the pinned bands leave the group the rest of the page', () => {
  const m = carouselEditorialMetrics;
  const layout = layoutEditorialAuthoritySlide({ headline: 'Short.', body: '', ...PAGE });

  assert.equal(
    layout.padTop + layout.topBandHeight + layout.bandHeight + layout.footerHeight + layout.padBottom,
    PAGE.height,
    'every band has to account for the page exactly',
  );
  assert.equal(
    layout.topBandHeight,
    m.progressFontSize * m.progressLineHeight + m.progressRowGap + m.iconSize,
  );
});
