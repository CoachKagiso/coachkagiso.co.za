import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCircleGeometry,
  getLineGeometry,
  getRoundedRectanglePath,
  getShapePolygonPoints,
  normalizeShapeRadii,
} from '../lib/content/design-shape-geometry.ts';
import {
  getDesignGroupScale,
  scaleDesignGroupChild,
} from '../lib/content/design-group-layout.ts';
import {
  EMBEDDABLE_BRAND_FONTS,
  emptyVectorFeatureReport,
  getExportFidelityNotice,
  getVectorExportBlocker,
  mapPdfFontFamily,
  mapPdfFontWeight,
} from '../lib/content/design-pdf-support.ts';

// The exported file is the artefact that leaves the building, and nobody
// notices it disagreeing with the canvas until after they have posted it. These
// pin the arithmetic both lanes now share.

test('a circle in a tall box is a circle, not a stadium', () => {
  const circle = getCircleGeometry(200, 600, 0);
  assert.equal(circle.r, 100, 'radius comes from the shorter side');
  assert.equal(circle.cx, 100);
  assert.equal(circle.cy, 300, 'and it sits in the middle of the box');
});

test('a circle keeps its whole stroke inside the box', () => {
  const circle = getCircleGeometry(200, 200, 20);
  assert.equal(circle.r, 90);
  assert.equal(circle.r + 20 / 2, 100, 'outer edge of the stroke lands on the box edge');
});

test('a line is drawn across the middle of its box', () => {
  const line = getLineGeometry(400, 90);
  assert.deepEqual(line, { x1: 0, y1: 45, x2: 400, y2: 45 });
});

test('a rounded rectangle is inset by half its stroke', () => {
  const radii = { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
  const path = getRoundedRectanglePath(100, 60, radii, 8);
  // Starts at the inset origin and closes on the inset far edge.
  assert.ok(path.startsWith('M 4 4'), path);
  assert.ok(path.includes('H 96'), path);
  assert.ok(path.includes('V 56'), path);
});

test('corner radii that would overlap are scaled to fit, as CSS does', () => {
  const fitted = normalizeShapeRadii(
    { topLeft: 80, topRight: 80, bottomRight: 0, bottomLeft: 0 },
    100,
    100,
  );
  // Both are clamped to half the box, then no further scaling is needed.
  assert.equal(fitted.topLeft, 50);
  assert.equal(fitted.topRight, 50);
  assert.ok(fitted.topLeft + fitted.topRight <= 100, 'the top edge still fits them');
});

test('every polygon shape insets its points, and only the polygons have any', () => {
  for (const shape of ['triangle', 'diamond', 'hexagon', 'star']) {
    const points = getShapePolygonPoints(shape, 300, 200, 10);
    assert.ok(points.length > 0, `${shape} should have points`);
    const coordinates = points.split(' ').flatMap((pair) => pair.split(',').map(Number));
    assert.ok(coordinates.every(Number.isFinite), `${shape} points must all be numbers`);
    assert.ok(Math.min(...coordinates) >= 0, `${shape} must stay inside its box`);
  }
  for (const shape of ['rectangle', 'circle', 'line']) {
    assert.equal(getShapePolygonPoints(shape, 300, 200, 10), '');
  }
});

test('a star has ten points and a waist at 45% of its radius', () => {
  const points = getShapePolygonPoints('star', 200, 200, 0).split(' ');
  assert.equal(points.length, 10);
  const measured = points.map((pair) => {
    const [x, y] = pair.split(',').map(Number);
    return Math.hypot(x - 100, y - 100);
  });
  assert.ok(Math.abs(Math.max(...measured) - 100) < 0.001, 'outer points reach the box');
  assert.ok(Math.abs(Math.min(...measured) - 45) < 0.001, 'inner points sit at 45%');
});

test('a saved group is scaled into the box it was dropped into', () => {
  // Groups are saved at the size of the selection and inserted at the asset
  // library's default size, so the two are almost never the same.
  const scale = getDesignGroupScale(340, 260, 680, 520);
  assert.equal(scale.x, 0.5);
  assert.equal(scale.y, 0.5);
  assert.equal(scale.detail, 0.5);

  const child = scaleDesignGroupChild(
    { x: 100, y: 200, width: 300, height: 80, fontSize: 48, strokeWidth: 6, borderRadius: 12 },
    scale,
  );
  assert.deepEqual(
    { x: child.x, y: child.y, width: child.width, height: child.height },
    { x: 50, y: 100, width: 150, height: 40 },
  );
  assert.equal(child.fontSize, 24);
  assert.equal(child.strokeWidth, 3);
  assert.equal(child.borderRadius, 6);
});

test('a stretched group scales type by the smaller axis, not the wider one', () => {
  const scale = getDesignGroupScale(800, 200, 400, 200);
  assert.equal(scale.x, 2);
  assert.equal(scale.y, 1);
  assert.equal(scale.detail, 1, 'type must not double because the frame got wider');

  const child = scaleDesignGroupChild({ x: 10, y: 10, width: 100, height: 50, fontSize: 20 }, scale);
  assert.equal(child.width, 200);
  assert.equal(child.height, 50);
  assert.equal(child.fontSize, 20);
});

test('scaling a group child leaves untouched fields alone', () => {
  const scale = getDesignGroupScale(100, 100, 200, 200);
  const child = scaleDesignGroupChild({ x: 0, y: 0, width: 10, height: 10, fontSize: undefined }, scale);
  assert.equal(child.fontSize, undefined, 'an absent size stays absent rather than becoming NaN');
});

test('a font with no file on disk blocks the vector lane', () => {
  // Sweet Bulky is loaded from a CDN; there is no file to embed, and the old
  // allow-by-omission check let it through and substituted Inter in silence.
  const blocker = getVectorExportBlocker(['sweetBulky']);
  assert.ok(blocker, 'sweetBulky must block');
  assert.match(blocker, /sweetBulky/);
});

test('every font the studio offers is either embeddable or blocked, never substituted', () => {
  // The studio's own list. A face added without a file lands in neither table,
  // so it must fail the blocker here rather than silently become Inter.
  const studioFonts = [
    'serif', 'sans', 'interTight', 'hand', 'alohaLover', 'daughterHand', 'heroIn',
    'bableya', 'linebrush', 'mibrush', 'walesiaSignatureBrush', 'walkingDream',
    'sweetBulky', 'simpleNotes', 'kaliebLuxury',
  ];
  const allowed = studioFonts.filter((family) => getVectorExportBlocker([family]) === null);
  assert.deepEqual(
    allowed.slice().sort(),
    ['sans', 'serif', 'interTight', ...Object.keys(EMBEDDABLE_BRAND_FONTS)].sort(),
    'only the body families and the six brand faces with files may pass',
  );
  for (const family of studioFonts) {
    if (allowed.includes(family)) continue;
    assert.equal(
      mapPdfFontFamily(family),
      'Inter',
      `${family} falls back to Inter, which is exactly why it has to be blocked`,
    );
  }
});

test('the two body families pass and map to their registered faces', () => {
  assert.equal(getVectorExportBlocker(['sans', 'serif', 'interTight']), null);
  assert.equal(mapPdfFontFamily('serif'), 'Playfair Display');
  assert.equal(mapPdfFontFamily('sans'), 'Inter');
  assert.equal(mapPdfFontFamily('interTight'), 'Inter');
});

test('italic blocks the vector lane, because there is no italic file', () => {
  const report = { ...emptyVectorFeatureReport(), fontFamilies: ['sans'], usesItalic: true };
  assert.match(getVectorExportBlocker(report), /italic/);
});

test('a shadow, outline or blur is reported, not used to force the raster lane', () => {
  // html2canvas has no CSS `filter` support either, so falling back would lose
  // the same effect more slowly and less sharply. Say so instead.
  const report = { ...emptyVectorFeatureReport(), fontFamilies: ['sans'], usesLayerEffects: true };
  assert.equal(getVectorExportBlocker(report), null, 'effects must not block the vector lane');
  assert.match(getExportFidelityNotice(report), /shadows, outlines and blur/);
});

test('a design with no effects gets no fidelity notice', () => {
  assert.equal(getExportFidelityNotice(emptyVectorFeatureReport()), null);
});

test('bolding a single-weight brand face blocks, rather than shipping the regular', () => {
  const report = {
    ...emptyVectorFeatureReport(),
    fontFamilies: ['linebrush'],
    syntheticBoldFamilies: ['linebrush'],
  };
  assert.match(getVectorExportBlocker(report), /no bold weight/);
});

test('bold on a multi-weight family is fine', () => {
  const report = {
    ...emptyVectorFeatureReport(),
    fontFamilies: ['sans'],
    syntheticBoldFamilies: ['sans'],
  };
  assert.equal(getVectorExportBlocker(report), null);
  assert.equal(mapPdfFontWeight('Inter', 700), 700);
});

test('a single-weight face is never asked for a weight it does not have', () => {
  assert.equal(mapPdfFontWeight('linebrush', 700), undefined);
  assert.equal(mapPdfFontWeight('walkingDream', 400), undefined);
});

test('an ordinary design has nothing to report', () => {
  const report = { ...emptyVectorFeatureReport(), fontFamilies: ['sans', 'serif'] };
  assert.equal(getVectorExportBlocker(report), null);
});

test('several problems are reported together, not one at a time', () => {
  const blocker = getVectorExportBlocker({
    fontFamilies: ['sweetBulky'],
    syntheticBoldFamilies: ['linebrush'],
    usesItalic: true,
    usesLayerEffects: false,
  });
  assert.match(blocker, /sweetBulky/);
  assert.match(blocker, /no bold weight/);
  assert.match(blocker, /italic/);
});
