import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  ASSISTANT_ACCESS_CAPABILITIES,
  buildAssistantCapabilityManifest,
} from '../lib/assistant-capabilities.ts';

const accessSource = fs.readFileSync(
  fileURLToPath(new URL('../lib/assistant-access.ts', import.meta.url)),
  'utf8',
);

/** Every tool name the access layer actually hands to the model. */
function getRealToolNames() {
  const names = new Set();
  const pattern = /name:\s*(?:includeBody\s*\?\s*)?'([A-Za-z]+)'(?:\s*:\s*'([A-Za-z]+)')?/g;
  let match;
  while ((match = pattern.exec(accessSource))) {
    names.add(match[1]);
    if (match[2]) names.add(match[2]);
  }
  return names;
}

function getManifestNames() {
  return new Set(ASSISTANT_ACCESS_CAPABILITIES.flatMap((capability) => capability.name.split(' / ')));
}

test('the manifest lists every tool the access layer can attach', () => {
  const missing = [...getRealToolNames()].filter((name) => !getManifestNames().has(name));
  assert.deepEqual(missing, [], `access tools missing from the capability manifest: ${missing.join(', ')}`);
});

test('the manifest does not promise tools that do not exist', () => {
  const invented = [...getManifestNames()].filter((name) => !getRealToolNames().has(name));
  assert.deepEqual(invented, [], `manifest lists tools with no access block: ${invented.join(', ')}`);
});

test('every capability explains what it reaches', () => {
  for (const capability of ASSISTANT_ACCESS_CAPABILITIES) {
    assert.ok(capability.reach.trim().length > 20, `${capability.name} needs a real description`);
  }
});

test('the manifest tells the model an absent snapshot is not a missing capability', () => {
  const manifest = buildAssistantCapabilityManifest();
  assert.match(manifest, /does NOT mean you lack the capability/);
  assert.match(manifest, /Never tell Kagiso you cannot see something listed above/);
  assert.match(manifest, /Never fill the gap with a guess/);
});

test('the manifest states the access is read-only', () => {
  assert.match(buildAssistantCapabilityManifest(), /read-only/i);
});
