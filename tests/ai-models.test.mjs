import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_OPENROUTER_PRIMARY_MODEL,
  DEFAULT_OPENROUTER_SECONDARY_MODEL,
  OPENROUTER_MODEL_OPTIONS,
} from '../lib/ai-models.ts';

test('OpenRouter starts with GLM selected instead of a Gemini fallback', () => {
  assert.equal(DEFAULT_OPENROUTER_PRIMARY_MODEL, 'z-ai/glm-5.2');
  assert.equal(DEFAULT_OPENROUTER_SECONDARY_MODEL, 'z-ai/glm-5.2');
  assert.equal(OPENROUTER_MODEL_OPTIONS[0]?.value, 'z-ai/glm-5.2');
});
