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
  getDesignBoxScale,
  scaleDesignLayerGeometry,
} from '../lib/content/design-layer-scale.ts';
import {
  EMBEDDABLE_BRAND_FONTS,
  emptyVectorFeatureReport,
  getExportFidelityNotice,
  getVectorExportBlocker,
  pdfFontHasItalic,
  mapPdfFontFamily,
  mapPdfFontWeight,
} from '../lib/content/design-pdf-support.ts';
import { collectDesignFontSpecs } from '../lib/content/design-font-specs.ts';

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
  const scale = getDesignBoxScale(340, 260, 680, 520);
  assert.equal(scale.x, 0.5);
  assert.equal(scale.y, 0.5);
  assert.equal(scale.detail, 0.5);

  const child = scaleDesignLayerGeometry(
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
  const scale = getDesignBoxScale(800, 200, 400, 200);
  assert.equal(scale.x, 2);
  assert.equal(scale.y, 1);
  assert.equal(scale.detail, 1, 'type must not double because the frame got wider');

  const child = scaleDesignLayerGeometry({ x: 10, y: 10, width: 100, height: 50, fontSize: 20 }, scale);
  assert.equal(child.width, 200);
  assert.equal(child.height, 50);
  assert.equal(child.fontSize, 20);
});

test('scaling a group child leaves untouched fields alone', () => {
  const scale = getDesignBoxScale(100, 100, 200, 200);
  const child = scaleDesignLayerGeometry({ x: 0, y: 0, width: 10, height: 10, fontSize: undefined }, scale);
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
    'sweetBulky', 'simpleNotes', 'kaliebLuxury', 'poppins',
  ];
  const allowed = studioFonts.filter((family) => getVectorExportBlocker([family]) === null);
  assert.deepEqual(
    allowed.slice().sort(),
    ['sans', 'serif', 'interTight', 'poppins', ...Object.keys(EMBEDDABLE_BRAND_FONTS)].sort(),
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

test('italic blocks a family whose italic would only be a slanted regular', () => {
  const report = { ...emptyVectorFeatureReport(), fontFamilies: ['sans'], italicFamilies: ['sans'] };
  assert.match(getVectorExportBlocker(report), /no italic font file/);
});

test('italic does not block Poppins, which ships a drawn italic', () => {
  const report = { ...emptyVectorFeatureReport(), fontFamilies: ['poppins'], italicFamilies: ['poppins'] };
  assert.equal(getVectorExportBlocker(report), null);
  assert.equal(pdfFontHasItalic('poppins'), true);
  assert.equal(pdfFontHasItalic('sans'), false);
  assert.equal(pdfFontHasItalic('serif'), false);
});

test('Poppins is embeddable, multi-weight, and maps to its own face', () => {
  assert.equal(getVectorExportBlocker(['poppins']), null);
  assert.equal(mapPdfFontFamily('poppins'), 'Poppins');
  // All four registered weights resolve to themselves rather than collapsing.
  assert.equal(mapPdfFontWeight('Poppins', 400), 400);
  assert.equal(mapPdfFontWeight('Poppins', 500), 500);
  assert.equal(mapPdfFontWeight('Poppins', 600), 600);
  assert.equal(mapPdfFontWeight('Poppins', 700), 700);
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
    italicFamilies: ['sans'],
    usesLayerEffects: false,
  });
  assert.match(blocker, /sweetBulky/);
  assert.match(blocker, /no bold weight/);
  assert.match(blocker, /italic/);
});

test('resizing the canvas carries the type with the box', () => {
  // Switching 9:16 to 4:5 keeps the width and compresses the height. The box
  // has always followed; the type size used to stay where it was, so the copy
  // no longer fitted the frame it had been laid out in.
  const scale = getDesignBoxScale(1080, 1350, 1080, 1920);
  assert.equal(scale.x, 1);
  assert.ok(Math.abs(scale.y - 0.703125) < 1e-9);
  assert.ok(Math.abs(scale.detail - 0.703125) < 1e-9);

  const heading = scaleDesignLayerGeometry(
    { x: 90, y: 400, width: 900, height: 200, fontSize: 64, letterSpacing: 2, borderRadius: 16 },
    scale,
  );
  assert.equal(heading.width, 900, 'width is untouched when only the height changes');
  assert.ok(Math.abs(heading.height - 140.625) < 1e-9);
  assert.ok(Math.abs(heading.fontSize - 45) < 1e-9, 'type shrinks with the frame');
  assert.ok(Math.abs(heading.letterSpacing - 1.40625) < 1e-9);
  assert.ok(Math.abs(heading.borderRadius - 11.25) < 1e-9);
})

test('a canvas resize that grows the frame grows the type too', () => {
  const scale = getDesignBoxScale(2160, 2700, 1080, 1350)
  assert.equal(scale.detail, 2)
  const layer = scaleDesignLayerGeometry({ x: 10, y: 10, width: 100, height: 50, fontSize: 21, strokeWidth: 3 }, scale)
  assert.equal(layer.fontSize, 42)
  assert.equal(layer.strokeWidth, 6)
})

test('the capture waits for the weight a run actually uses, not just 400 and 700', () => {
  // Un-bolding an inline run sets 500. It was never loaded, so html2canvas drew
  // it in a fallback whose glyphs are a different width - the text then sits at
  // a width it was not laid out at.
  const specs = collectDesignFontSpecs([
    { fontFamily: '"Poppins", sans-serif', fontWeight: '500', fontStyle: 'normal' },
    { fontFamily: '"Poppins", sans-serif', fontWeight: '700', fontStyle: 'normal' },
  ]);
  assert.ok(specs.includes('500 16px "Poppins"'), specs.join(' | '));
  assert.ok(specs.includes('700 16px "Poppins"'), specs.join(' | '));
})

test('italic is asked for as italic', () => {
  const specs = collectDesignFontSpecs([
    { fontFamily: 'Poppins', fontWeight: '400', fontStyle: 'italic' },
  ]);
  assert.deepEqual(specs, ['italic 400 16px "Poppins"'])
})

test('generic keywords are skipped - there is nothing to fetch', () => {
  const specs = collectDesignFontSpecs([
    { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: '600', fontStyle: 'normal' },
  ]);
  assert.deepEqual(specs, ['600 16px "Playfair Display"', '600 16px "Georgia"'])
})

test('the same face asked for twice is loaded once', () => {
  const specs = collectDesignFontSpecs([
    { fontFamily: 'Inter', fontWeight: '400', fontStyle: 'normal' },
    { fontFamily: 'Inter', fontWeight: '400', fontStyle: 'normal' },
    { fontFamily: 'Inter', fontWeight: '600', fontStyle: 'normal' },
  ]);
  assert.deepEqual(specs.sort(), ['400 16px "Inter"', '600 16px "Inter"'])
})

test('a node with no font family contributes nothing', () => {
  assert.deepEqual(collectDesignFontSpecs([{ fontFamily: '', fontWeight: '400', fontStyle: 'normal' }]), [])
})

test('a missing weight falls back to 400 rather than an unparseable shorthand', () => {
  const specs = collectDesignFontSpecs([{ fontFamily: 'Inter', fontWeight: '', fontStyle: '' }]);
  assert.deepEqual(specs, ['400 16px "Inter"'])
})
