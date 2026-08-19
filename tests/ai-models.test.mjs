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
});

test('both defaults name a model the picker actually offers', () => {
  // normalizeOpenRouterModel silently swaps an unknown value for the default, so a default that
  // is not in the catalogue would strand every unsaved install on a model it cannot display.
  const values = new Set(OPENROUTER_MODEL_OPTIONS.map((option) => option.value));
  assert.ok(values.has(DEFAULT_OPENROUTER_PRIMARY_MODEL), 'primary default must be a listed model');
  assert.ok(values.has(DEFAULT_OPENROUTER_SECONDARY_MODEL), 'secondary default must be a listed model');
});

test('the picker stays ordered by intelligence, strongest first', () => {
  const scores = OPENROUTER_MODEL_OPTIONS.map((option) => option.intelligence);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
});

test('every listed model carries the fields the picker renders', () => {
  for (const option of OPENROUTER_MODEL_OPTIONS) {
    assert.ok(option.value.trim(), 'a model needs a value');
    assert.equal(option.label, option.value, `${option.value} label should match its value`);
    assert.equal(typeof option.intelligence, 'number', `${option.value} needs an intelligence score`);
    assert.equal(typeof option.inputPrice, 'number', `${option.value} needs an input price`);
    assert.equal(typeof option.outputPrice, 'number', `${option.value} needs an output price`);
  }
  assert.equal(new Set(OPENROUTER_MODEL_OPTIONS.map((option) => option.value)).size, OPENROUTER_MODEL_OPTIONS.length);
});
