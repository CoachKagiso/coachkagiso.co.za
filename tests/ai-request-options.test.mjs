import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAiConnectionTestBody, getAiProviderRequestOptions, isReasoningActive, withReasoningHeadroom } from '../lib/ai-request.ts';
import { getFallbackVisionModel, modelSupportsVision } from '../lib/ai-models.ts';

test('disables OpenRouter reasoning when reasoningEnabled is false (default)', () => {
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'deepseek/deepseek-v4.1-flash'), {
    reasoning: { effort: 'none' },
  });
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'anthropic/claude-opus-5'), {
    reasoning: { effort: 'none' },
  });
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'xiaomi/mimo-v2.6-pro'), {
    reasoning: { effort: 'none' },
  });
});

test('allows OpenRouter model default reasoning when reasoningEnabled is true', () => {
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'deepseek/deepseek-v4.1-flash', true), {});
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'anthropic/claude-opus-5', true), {});
});

test('never sends the reasoning disable to an endpoint that mandates reasoning', () => {
  // Toggle off means the cheapest effort the endpoint accepts - never the provider
  // default (max), which would spend the output budget thinking before answering.
  for (const model of ['google/gemini-3.8-flash', 'x-ai/grok-4.7', 'z-ai/glm-5.3-flash', 'meta/muse-spark-1.3']) {
    assert.deepEqual(getAiProviderRequestOptions('openrouter', model), {
      reasoning: { effort: 'low' },
    });
    assert.deepEqual(getAiProviderRequestOptions('openrouter', model, true), {});
  }
});

test('treats a reasoning-mandatory model as reasoning-active even with the toggle off', () => {
  assert.equal(isReasoningActive('openrouter', 'google/gemini-3.8-flash', false), true);
  assert.equal(isReasoningActive('openrouter', 'deepseek/deepseek-v4.1-flash', false), false);
  assert.equal(isReasoningActive('openrouter', 'deepseek/deepseek-v4.1-flash', true), true);
  assert.equal(isReasoningActive('zai', 'glm-5.2', true), false);
});

test('keeps Z.ai thinking disabled regardless of reasoningEnabled', () => {
  assert.deepEqual(getAiProviderRequestOptions('zai', 'glm-5.2'), {
    thinking: { type: 'disabled' },
  });
  assert.deepEqual(getAiProviderRequestOptions('zai', 'glm-5.2', true), {
    thinking: { type: 'disabled' },
  });
});

test('image requests fall back to a vision-capable model when the configured one is text only', () => {
  // Every production model currently reads images, so a retired id stands in
  // for the text-only case the fallback exists for.
  assert.equal(modelSupportsVision('retired/text-only-model'), false);
  assert.equal(modelSupportsVision('anthropic/claude-opus-5'), true);
  assert.ok(getFallbackVisionModel(), 'a vision-capable fallback must exist in the catalogue');
  assert.equal(modelSupportsVision(getFallbackVisionModel()), true);
});

test('the connection probe stays cheap for ordinary models', () => {
  assert.deepEqual(buildAiConnectionTestBody('deepseek/deepseek-v4.1-flash'), {
    model: 'deepseek/deepseek-v4.1-flash',
    messages: [{ role: 'user', content: 'Reply with the word CONNECTED only.' }],
    max_tokens: 20,
    temperature: 0,
  });
});

test('the connection probe gives reasoning-mandatory models room to think', () => {
  // A 20-token budget would be spent thinking before a word is visible, so the
  // probe carries headroom and an explicit low effort instead of failing.
  for (const model of ['meta/muse-spark-1.3', 'z-ai/glm-5.3-flash', 'x-ai/grok-4.7', 'google/gemini-3.8-flash']) {
    const body = buildAiConnectionTestBody(model);
    assert.equal(body.model, model);
    assert.deepEqual(body.reasoning, { effort: 'low' });
    assert.ok(typeof body.max_tokens === 'number' && body.max_tokens > 20, `${model} probe needs thinking headroom`);
    assert.ok(!('temperature' in body), `${model} probe must not override sampling`);
  }
});

test('reasoning headroom scales with the answer budget, with a floor for short routes', () => {
  // Short routes keep the flat floor - a 100-token title needs no more thinking than that.
  assert.equal(withReasoningHeadroom(100), 4100);
  assert.equal(withReasoningHeadroom(900), 4900);
  // The CV analyzer asks for 4096 and used to land on exactly 8096 - the old flat allowance -
  // with the JSON cut mid-object. It must now get materially more room than the answer itself.
  const analyzerBudget = withReasoningHeadroom(4096);
  assert.ok(analyzerBudget > 8096, 'the analyzer must clear the budget it was truncating at');
  assert.equal(analyzerBudget, 12288);
});
