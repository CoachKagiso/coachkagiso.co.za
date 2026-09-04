import assert from 'node:assert/strict';
import test from 'node:test';

import { parseRichText, stripRichText } from '../lib/content/rich-text.ts';

const shape = (text) =>
  parseRichText(text).map((run) => [run.text, run.bold ? 'b' : '', run.italic ? 'i' : '', run.underline ? 'u' : ''].join(''));

test('plain copy is one plain run', () => {
  assert.deepEqual(parseRichText('Only one of these signs.'), [
    { text: 'Only one of these signs.', bold: false, italic: false, underline: false },
  ]);
});

test('each marker produces its own style', () => {
  assert.deepEqual(shape('a **b** c'), ['a ', 'bb', ' c']);
  assert.deepEqual(shape('a ~~b~~ c'), ['a ', 'bi', ' c']);
  assert.deepEqual(shape('a __b__ c'), ['a ', 'bu', ' c']);
});

test('no two markers share an opening, so none can be misread as another', () => {
  // Italic was `*` first. `**bold and *italic***` then parsed as a bold run
  // ending early with a stray asterisk left on the slide.
  const openings = Object.values({ bold: '**', italic: '~~', underline: '__' });
  for (const a of openings) {
    for (const b of openings) {
      if (a !== b) assert.ok(!a.startsWith(b) && !b.startsWith(a), `${a} and ${b} collide`);
    }
  }
  assert.deepEqual(shape('**word**'), ['wordb']);
});

test('styles combine rather than replace each other', () => {
  const runs = parseRichText('**bold and ~~also italic~~**');
  const both = runs.find((run) => run.italic);
  assert.ok(both.bold, 'the italic run inside a bold one stays bold');
});

test('an unmatched marker stays in the text as itself', () => {
  // A lone asterisk in a sentence is an asterisk, not the start of a style
  // that swallows the rest of the slide.
  assert.equal(stripRichText('2 * 3 = 6'), '2 * 3 = 6');
  assert.equal(stripRichText('a_b'), 'a_b');
  assert.equal(stripRichText('roughly ~30 minutes'), 'roughly ~30 minutes');
});

test('stripping leaves exactly the words', () => {
  assert.equal(
    stripRichText('Only one is about **performance** and __visibility__.'),
    'Only one is about performance and visibility.',
  );
});

test('empty input is no runs', () => {
  assert.deepEqual(parseRichText(''), []);
});
