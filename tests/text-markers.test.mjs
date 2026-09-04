import assert from 'node:assert/strict';
import test from 'node:test';

import { styleShortcut, toggleTextMarkers } from '../lib/content/text-markers.ts';

/** Selecting `word` inside the sentence, by index. */
const at = (value, word) => [value.indexOf(word), value.indexOf(word) + word.length];

test('wraps the selection and leaves it selected, markers excluded', () => {
  const value = 'Only one of these signs is about performance.';
  const [from, to] = at(value, 'performance');
  const next = toggleTextMarkers(value, from, to);

  assert.equal(next.value, 'Only one of these signs is about **performance**.');
  assert.equal(next.value.slice(next.start, next.end), 'performance', 'the word stays selected, not the markers');
});

test('unwraps when the selection is already bold', () => {
  const value = 'Only one is about **performance**.';
  const [from, to] = at(value, 'performance');
  const next = toggleTextMarkers(value, from, to);

  assert.equal(next.value, 'Only one is about performance.');
  assert.equal(next.value.slice(next.start, next.end), 'performance');
});

test('unwraps when the markers were caught inside the selection too', () => {
  // Dragging across the whole run takes the markers with it; pressing bold
  // again should still turn it off rather than double up.
  const value = 'Only one is about **performance**.';
  const from = value.indexOf('**');
  const to = value.lastIndexOf('**') + 2;
  const next = toggleTextMarkers(value, from, to);

  assert.equal(next.value, 'Only one is about performance.');
  assert.equal(next.value.slice(next.start, next.end), 'performance');
});

test('leaves whitespace at the edges outside the markers', () => {
  // Double-clicking a word usually takes the trailing space with it, and a bold
  // space shows up as odd letter-spacing that nobody can find the cause of.
  const value = 'about performance and visibility';
  const from = value.indexOf('performance');
  const next = toggleTextMarkers(value, from, from + 'performance '.length);

  assert.equal(next.value, 'about **performance** and visibility');
  assert.equal(next.value.slice(next.start, next.end), 'performance');
});

test('with nothing selected it opens an empty pair and puts the caret inside', () => {
  const next = toggleTextMarkers('Only one is about ', 18, 18);
  assert.equal(next.value, 'Only one is about ****');
  assert.equal(next.start, 20);
  assert.equal(next.start, next.end, 'a caret, not a selection');
});

test('a selection of pure whitespace is left alone', () => {
  const value = 'one   two';
  const next = toggleTextMarkers(value, 3, 6);
  assert.equal(next.value, value, 'there is no word here to embolden');
});

test('survives a backwards selection and out-of-range indexes', () => {
  const value = 'about performance';
  const from = value.indexOf('performance');
  const backwards = toggleTextMarkers(value, from + 11, from);
  assert.equal(backwards.value, 'about **performance**');

  const clamped = toggleTextMarkers('short', -5, 999);
  assert.equal(clamped.value, '**short**');
});

test('the shortcuts map to a style on either platform, and nothing else', () => {
  assert.equal(styleShortcut({ key: 'b', metaKey: true, ctrlKey: false }), 'bold');
  assert.equal(styleShortcut({ key: 'I', metaKey: false, ctrlKey: true }), 'italic');
  assert.equal(styleShortcut({ key: 'u', metaKey: false, ctrlKey: true }), 'underline');
  assert.equal(styleShortcut({ key: 'b', metaKey: false, ctrlKey: false }), null, 'a bare letter is typing');
  assert.equal(styleShortcut({ key: 's', metaKey: true, ctrlKey: false }), null);
});

test('the same toggle works for the other two styles', () => {
  const plain = 'about performance';
  const from = plain.indexOf('performance');
  assert.equal(toggleTextMarkers(plain, from, plain.length, 'italic').value, 'about ~~performance~~');
  assert.equal(toggleTextMarkers(plain, from, plain.length, 'underline').value, 'about __performance__');

  // Indexes have to come from the marked string, not the plain one.
  const marked = 'about ~~performance~~';
  const at = marked.indexOf('performance');
  assert.equal(toggleTextMarkers(marked, at, at + 11, 'italic').value, plain);
});
