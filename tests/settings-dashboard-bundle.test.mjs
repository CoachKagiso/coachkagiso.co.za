import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSettingsDashboardBundle } from '../lib/settings-dashboard-bundle.ts';

const defaults = {
  settings: { ai_config: { primary_model: 'z-ai/glm-5.2' } },
  emailTemplates: [{ id: 'default-template' }],
};

test('keeps persisted settings when email templates fail to load', async () => {
  const result = await loadSettingsDashboardBundle({
    defaults,
    loadSettings: async () => ({ ai_config: { primary_model: 'anthropic/claude-opus-5' } }),
    loadEmailTemplates: async () => {
      throw new Error('Email template schema is unavailable');
    },
  });

  assert.equal(result.settings.ai_config.primary_model, 'anthropic/claude-opus-5');
  assert.deepEqual(result.emailTemplates, defaults.emailTemplates);
});

test('keeps email templates when settings fail to load', async () => {
  const savedTemplates = [{ id: 'saved-template' }];
  const result = await loadSettingsDashboardBundle({
    defaults,
    loadSettings: async () => {
      throw new Error('Settings table is unavailable');
    },
    loadEmailTemplates: async () => savedTemplates,
  });

  assert.deepEqual(result.settings, defaults.settings);
  assert.deepEqual(result.emailTemplates, savedTemplates);
});
