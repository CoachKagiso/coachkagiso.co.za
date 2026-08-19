import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('global textareas allow wheel scrolling to chain to the page', async () => {
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

  assert.match(css, /textarea\s*\{[^}]*overscroll-behavior:\s*auto/);
  assert.doesNotMatch(css, /textarea\s*\{[^}]*overscroll-behavior:\s*contain/);
});
