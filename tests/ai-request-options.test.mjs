import assert from 'node:assert/strict';
import test from 'node:test';

import { getAiProviderRequestOptions } from '../lib/ai-request.ts';

test('disables OpenRouter reasoning when reasoningEnabled is false (default)', () => {
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'z-ai/glm-5.2'), {
    reasoning: { effort: 'none' },
  });
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'moonshotai/kimi-k3'), {
    reasoning: { effort: 'none' },
  });
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'x-ai/grok-4.5'), {
    reasoning: { effort: 'none' },
  });
});

test('allows OpenRouter model default reasoning when reasoningEnabled is true', () => {
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'z-ai/glm-5.2', true), {});
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'moonshotai/kimi-k3', true), {});
});

test('keeps Z.ai thinking disabled regardless of reasoningEnabled', () => {
  assert.deepEqual(getAiProviderRequestOptions('zai', 'glm-5.2'), {
    thinking: { type: 'disabled' },
  });
  assert.deepEqual(getAiProviderRequestOptions('zai', 'glm-5.2', true), {
    thinking: { type: 'disabled' },
  });
});
