import assert from 'node:assert/strict';
import test from 'node:test';
import { hasConfiguredOpenRouterKey, mergeOpenRouterKeyForSave } from '../lib/openrouter-key-settings.ts';

const savedConfig = {
  primary_model: 'z-ai/glm-5.2',
  secondary_model: 'z-ai/glm-5.2',
  model_provider: 'openrouter',
  openrouter_api_key: 'saved-openrouter-key',
  test_mode: false,
};

test('keeps the saved OpenRouter key when a model-only settings save leaves it blank', () => {
  const saved = mergeOpenRouterKeyForSave(savedConfig, {
    ...savedConfig,
    primary_model: 'moonshotai/kimi-k3',
    openrouter_api_key: '',
    openrouter_api_key_configured: true,
  });

  assert.equal(saved.primary_model, 'moonshotai/kimi-k3');
  assert.equal(saved.openrouter_api_key, 'saved-openrouter-key');
  assert.equal('openrouter_api_key_configured' in saved, false);
});

test('replaces the saved OpenRouter key only when a new key is supplied', () => {
  const saved = mergeOpenRouterKeyForSave(savedConfig, {
    ...savedConfig,
    openrouter_api_key: 'replacement-openrouter-key',
  });

  assert.equal(saved.openrouter_api_key, 'replacement-openrouter-key');
});

test('detects that a saved OpenRouter key exists without exposing it', () => {
  assert.equal(hasConfiguredOpenRouterKey(savedConfig), true);
  assert.equal(hasConfiguredOpenRouterKey({ openrouter_api_key: '' }), false);
});
