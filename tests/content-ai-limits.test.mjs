import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_CONTENT_TEMPERATURE, getContentAiMaxTokens, resolveTemperatureForRegister } from '../lib/content/ai-limits.ts';

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

test('sampling temperature follows the writing register', () => {
  assert.equal(resolveTemperatureForRegister('conviction_reframe'), 0.45);
  assert.equal(resolveTemperatureForRegister('reflection_friday'), 0.45);
  assert.equal(resolveTemperatureForRegister('reflective_leader'), 0.6);
  assert.equal(resolveTemperatureForRegister('the_challenger'), 0.6);
  assert.equal(resolveTemperatureForRegister('tactical_teacher'), 0.65);
  assert.equal(resolveTemperatureForRegister('celebration_gratitude'), 0.65);
});

test('unknown registers keep the historic default temperature', () => {
  assert.equal(resolveTemperatureForRegister(''), DEFAULT_CONTENT_TEMPERATURE);
  assert.equal(resolveTemperatureForRegister(undefined), DEFAULT_CONTENT_TEMPERATURE);
  assert.equal(resolveTemperatureForRegister('not_a_register'), DEFAULT_CONTENT_TEMPERATURE);
  assert.equal(resolveTemperatureForRegister('CONVICTION_REFRAME'), 0.45, 'matching is case-insensitive');
});
