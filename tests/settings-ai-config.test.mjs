import assert from 'node:assert/strict';
import test from 'node:test';
import { hasConfiguredOpenRouterKey, mergeOpenRouterKeyForSave } from '../lib/openrouter-key-settings.ts';
import { PRIMARY_MODEL_TOOLS, SECONDARY_MODEL_TOOLS } from '../lib/zai-pinned-tools.ts';

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

test('never persists the server-derived Z.ai configured flag', () => {
  const saved = mergeOpenRouterKeyForSave(savedConfig, {
    ...savedConfig,
    zai_api_key_configured: true,
  });

  assert.equal('zai_api_key_configured' in saved, false);
});

test('every secondary-model tool is listed with a stable id and a dashboard location', () => {
  assert.equal(SECONDARY_MODEL_TOOLS.length, 6);
  assert.equal(new Set(SECONDARY_MODEL_TOOLS.map((tool) => tool.id)).size, 6);
  for (const tool of SECONDARY_MODEL_TOOLS) {
    assert.ok(tool.label.trim(), `${tool.id} needs a label`);
    assert.ok(tool.where.trim(), `${tool.id} needs a dashboard location`);
  }
});

test('every primary-model tool is listed with a stable id and a dashboard location', () => {
  assert.equal(PRIMARY_MODEL_TOOLS.length, 8);
  assert.equal(new Set(PRIMARY_MODEL_TOOLS.map((tool) => tool.id)).size, 8);
  for (const tool of PRIMARY_MODEL_TOOLS) {
    assert.ok(tool.label.trim(), `${tool.id} needs a label`);
    assert.ok(tool.where.trim(), `${tool.id} needs a dashboard location`);
  }
});

test('no tool is claimed by both the primary and the secondary model', () => {
  const secondaryIds = new Set(SECONDARY_MODEL_TOOLS.map((tool) => tool.id));
  for (const tool of PRIMARY_MODEL_TOOLS) {
    assert.ok(!secondaryIds.has(tool.id), `${tool.id} must run on exactly one model`);
  }
});
