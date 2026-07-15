import assert from 'node:assert/strict';
import test from 'node:test';

import { getAiProviderRequestOptions } from '../lib/ai-request.ts';

test('disables OpenRouter reasoning for GLM content generation', () => {
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'z-ai/glm-5.2'), {
    reasoning: { effort: 'none' },
  });
});

test('keeps Z.ai thinking disabled and leaves other OpenRouter models unchanged', () => {
  assert.deepEqual(getAiProviderRequestOptions('zai', 'glm-5.2'), {
    thinking: { type: 'disabled' },
  });
  assert.deepEqual(getAiProviderRequestOptions('openrouter', 'google/gemini-pro-3.1'), {});
});
