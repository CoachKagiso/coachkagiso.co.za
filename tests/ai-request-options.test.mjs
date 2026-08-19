import assert from 'node:assert/strict';
import test from 'node:test';

import { getAiProviderRequestOptions, isReasoningActive } from '../lib/ai-request.ts';
import { getFallbackVisionModel, modelSupportsVision } from '../lib/ai-models.ts';

test('disables OpenRouter reasoning when reasoningEnabled is false (default)', () => {
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'z-ai/glm-5.2'), {
    reasoning: { effort: 'none' },
  });
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'moonshotai/kimi-k3'), {
    reasoning: { effort: 'none' },
  });
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'x-ai/grok-4.6'), {
    reasoning: { effort: 'none' },
  });
});

test('allows OpenRouter model default reasoning when reasoningEnabled is true', () => {
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'z-ai/glm-5.2', true), {});
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'moonshotai/kimi-k3', true), {});
});

test('never sends the reasoning disable to an endpoint that mandates reasoning', () => {
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'google/gemini-3.7-flash'), {});
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'google/gemini-3.7-flash', true), {});
});

test('treats a reasoning-mandatory model as reasoning-active even with the toggle off', () => {
  assert.equal(isReasoningActive('openrouter', 'google/gemini-3.7-flash', false), true);
  assert.equal(isReasoningActive('openrouter', 'z-ai/glm-5.2', false), false);
  assert.equal(isReasoningActive('openrouter', 'z-ai/glm-5.2', true), true);
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
  assert.equal(modelSupportsVision('z-ai/glm-5.2'), false);
  assert.equal(modelSupportsVision('anthropic/claude-opus-5'), true);
  assert.ok(getFallbackVisionModel(), 'a vision-capable fallback must exist in the catalogue');
  assert.equal(modelSupportsVision(getFallbackVisionModel()), true);
});
