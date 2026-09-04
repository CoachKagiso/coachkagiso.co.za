import assert from 'node:assert/strict';
import test from 'node:test';

import { isBoldShortcut, toggleBoldMarkers } from '../lib/content/bold-markers.ts';

/** Selecting `word` inside the sentence, by index. */
const at = (value, word) => [value.indexOf(word), value.indexOf(word) + word.length];

test('wraps the selection and leaves it selected, markers excluded', () => {
  const value = 'Only one of these signs is about performance.';
  const [from, to] = at(value, 'performance');
  const next = toggleBoldMarkers(value, from, to);

  assert.equal(next.value, 'Only one of these signs is about **performance**.');
  assert.equal(next.value.slice(next.start, next.end), 'performance', 'the word stays selected, not the markers');
});

test('unwraps when the selection is already bold', () => {
  const value = 'Only one is about **performance**.';
  const [from, to] = at(value, 'performance');
  const next = toggleBoldMarkers(value, from, to);

  assert.equal(next.value, 'Only one is about performance.');
  assert.equal(next.value.slice(next.start, next.end), 'performance');
});

test('unwraps when the markers were caught inside the selection too', () => {
  // Dragging across the whole run takes the markers with it; pressing bold
  // again should still turn it off rather than double up.
  const value = 'Only one is about **performance**.';
  const from = value.indexOf('**');
  const to = value.lastIndexOf('**') + 2;
  const next = toggleBoldMarkers(value, from, to);

  assert.equal(next.value, 'Only one is about performance.');
  assert.equal(next.value.slice(next.start, next.end), 'performance');
});

test('leaves whitespace at the edges outside the markers', () => {
  // Double-clicking a word usually takes the trailing space with it, and a bold
  // space shows up as odd letter-spacing that nobody can find the cause of.
  const value = 'about performance and visibility';
  const from = value.indexOf('performance');
  const next = toggleBoldMarkers(value, from, from + 'performance '.length);

  assert.equal(next.value, 'about **performance** and visibility');
  assert.equal(next.value.slice(next.start, next.end), 'performance');
});

test('with nothing selected it opens an empty pair and puts the caret inside', () => {
  const next = toggleBoldMarkers('Only one is about ', 18, 18);
  assert.equal(next.value, 'Only one is about ****');
  assert.equal(next.start, 20);
  assert.equal(next.start, next.end, 'a caret, not a selection');
});

test('a selection of pure whitespace is left alone', () => {
  const value = 'one   two';
  const next = toggleBoldMarkers(value, 3, 6);
  assert.equal(next.value, value, 'there is no word here to embolden');
});

test('survives a backwards selection and out-of-range indexes', () => {
  const value = 'about performance';
  const from = value.indexOf('performance');
  const backwards = toggleBoldMarkers(value, from + 11, from);
  assert.equal(backwards.value, 'about **performance**');

  const clamped = toggleBoldMarkers('short', -5, 999);
  assert.equal(clamped.value, '**short**');
});

test('the shortcut is bold on either platform, and nothing else', () => {
  assert.equal(isBoldShortcut({ key: 'b', metaKey: true, ctrlKey: false }), true);
  assert.equal(isBoldShortcut({ key: 'B', metaKey: false, ctrlKey: true }), true);
  assert.equal(isBoldShortcut({ key: 'b', metaKey: false, ctrlKey: false }), false);
  assert.equal(isBoldShortcut({ key: 'i', metaKey: true, ctrlKey: false }), false);
});
