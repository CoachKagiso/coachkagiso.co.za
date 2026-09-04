import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  SWIPE_ICON_COLOR,
  SWIPE_ICON_PATHS,
  SWIPE_ICON_VIEW_BOX,
} from '../lib/content/carousel-swipe-icon.ts';

const SOURCE = 'public/design-elements/brand-assets/swipe-left.svg';

test('the inlined swipe mark still matches the asset it was taken from', () => {
  // Both lanes draw this from the constant rather than the file: the preview
  // could load the SVG, but @react-pdf has no SVG image support and needs the
  // geometry as Path elements. That copy can drift from the asset Design Studio
  // shows in its picker, and nothing else would notice.
  const svg = readFileSync(SOURCE, 'utf8');
  const viewBox = /viewBox="([^"]+)"/.exec(svg)[1];
  const paths = [...svg.matchAll(/<path\s+d="([^"]+)"/g)].map((match) => match[1]);

  assert.equal(SWIPE_ICON_VIEW_BOX, viewBox, `regenerate from ${SOURCE}`);
  assert.deepEqual([...SWIPE_ICON_PATHS], paths, `regenerate from ${SOURCE}`);
});

test('it is a filled mark, which is why the renderers set a fill and no stroke', () => {
  // The lucide hand it replaced was stroked. Drawn with a stroke instead, this
  // one comes out as an outline of a silhouette rather than the silhouette.
  const svg = readFileSync(SOURCE, 'utf8');
  assert.match(svg, /<path\s+d="[^"]+"\s+fill="/, 'the asset paths carry a fill');
  assert.ok(SWIPE_ICON_PATHS.length >= 2, 'the hand and its arc are separate paths');
});

test('it is drawn in the colour Design Studio ships the asset in', () => {
  // The mark took the rose the lucide hand had used when it first replaced it,
  // which was nobody's decision - just what was already there. This is the
  // asset's own defaultColor, and the test keeps the two from parting company
  // if the entry is ever recoloured.
  const panel = readFileSync('components/content/DesignStudioPanel.tsx', 'utf8');
  const entry = panel.slice(panel.indexOf('brand_swipe_left: {'));
  const defaultColor = /defaultColor: '([^']+)'/.exec(entry)[1];

  assert.equal(SWIPE_ICON_COLOR, defaultColor);
});
