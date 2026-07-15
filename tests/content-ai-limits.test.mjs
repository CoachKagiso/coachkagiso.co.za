import assert from 'node:assert/strict';
import test from 'node:test';

import { getContentAiMaxTokens } from '../lib/content/ai-limits.ts';

test('reserves enough output budget for complete TikTok short scripts', () => {
  assert.equal(getContentAiMaxTokens('write_post', 'short_script'), 3200);
});

test('uses the same expanded budget for every video-script format', () => {
  for (const contentType of ['series_part', 'pov_video', 'reaction_video', 'tip_video']) {
    assert.equal(getContentAiMaxTokens('write_post', contentType), 3200);
  }
});

test('keeps the existing budget for standard posts', () => {
  assert.equal(getContentAiMaxTokens('write_post', 'linkedin_post'), 1800);
});
