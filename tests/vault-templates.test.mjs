import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BACKLOG_VAULT_SECTIONS,
  getVaultSectionForItem,
  isBacklogVaultSection,
  vaultPolicies,
} from '../lib/content/vault-policy.ts';

test('templates are a vault section with their own policy', () => {
  assert.ok(vaultPolicies.templates, 'templates must have a policy');
  assert.equal(vaultPolicies.templates.label, 'Templates');
});

test('templates are never swept by the backlog expiry rules', () => {
  assert.equal(isBacklogVaultSection('templates'), false);
  for (const section of BACKLOG_VAULT_SECTIONS) {
    assert.equal(isBacklogVaultSection(section), true, `${section} is backlog-backed`);
  }
});

test('no backlog item is ever routed into the templates section', () => {
  // Templates live in carousel_dna, so the backlog classifier must not produce
  // 'templates' for any shape of item.
  const items = [
    { source: 'manual', notes: null },
    { source: 'insights', notes: null },
    { source: 'manual', notes: '[vault:messy-middle]' },
    { source: 'manual', notes: '{"kind":"smart_suggest"}' },
    { source: 'manual', notes: '{"kind":"insights_article"}' },
  ];
  for (const item of items) {
    assert.notEqual(getVaultSectionForItem(item), 'templates');
    assert.equal(isBacklogVaultSection(getVaultSectionForItem(item)), true);
  }
});

test('every backlog section still has a policy', () => {
  for (const section of BACKLOG_VAULT_SECTIONS) {
    assert.ok(vaultPolicies[section], `${section} must keep its policy`);
    assert.ok(vaultPolicies[section].maxItems > 0);
  }
});
