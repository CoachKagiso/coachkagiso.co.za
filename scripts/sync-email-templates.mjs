/**
 * Push the code-defined email templates in lib/email-templates.ts into the
 * `email_templates` table.
 *
 * The normal seed path (lib/settings.ts) upserts with `ignoreDuplicates: true`,
 * so rows that already exist never pick up copy changes. This script is the
 * deliberate override for when the wording in code is the new source of truth.
 *
 * Usage:
 *   node scripts/sync-email-templates.mjs --env=../../../.env.local            # dry run
 *   node scripts/sync-email-templates.mjs --env=../../../.env.local --apply
 *   node scripts/sync-email-templates.mjs --apply --only=engaged_strategist,plateaued_performer
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();

// lib/*.ts uses the `@/` tsconfig alias, which node does not understand.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      let target = path.join(root, specifier.slice(2));
      // The alias is written without a file extension; node needs the real path.
      if (!path.extname(target)) {
        if (fs.existsSync(`${target}.ts`)) target = `${target}.ts`;
        else if (fs.existsSync(`${target}.tsx`)) target = `${target}.tsx`;
        else if (fs.existsSync(path.join(target, 'index.ts'))) target = path.join(target, 'index.ts');
      }
      return { url: pathToFileURL(target).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

function arg(name, fallback = null) {
  const hit = process.argv.find((item) => item.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
}

const apply = process.argv.includes('--apply');
const only = (arg('only') || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const envPath = path.resolve(root, arg('env', '.env.local'));
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!process.env[key]) process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
  }
} else {
  throw new Error(`Env file not found: ${envPath}`);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const { EMAIL_TEMPLATES } = await import('../lib/email-templates.ts');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const templates = EMAIL_TEMPLATES.filter(
  (template) => only.length === 0 || only.some((prefix) => template.id.startsWith(prefix)),
);

const { data: rows, error } = await supabase
  .from('email_templates')
  .select('template_id, subject, body, recommended_service, booking_key, stage_label');
if (error) throw new Error(error.message);

const existing = new Map((rows || []).map((row) => [row.template_id, row]));
const drifted = [];
const missing = [];

for (const template of templates) {
  const row = existing.get(template.id);
  if (!row) {
    missing.push(template);
    continue;
  }
  const changes = [];
  if (row.subject !== template.subject) changes.push('subject');
  if (row.body !== template.body) changes.push('body');
  if (row.recommended_service !== template.recommendedService) changes.push('recommended_service');
  if (row.booking_key !== template.bookingKey) changes.push('booking_key');
  if (row.stage_label !== template.stageLabel) changes.push('stage_label');
  if (changes.length) drifted.push({ template, changes });
}

console.log(`Project: ${supabaseUrl}`);
console.log(`Templates in code: ${templates.length}`);
console.log(`Rows in database:  ${existing.size}`);
console.log(`Not yet in database: ${missing.length}`);
console.log(`Differing from code: ${drifted.length}`);
for (const { template, changes } of drifted) {
  console.log(`  - ${template.id} (${changes.join(', ')})`);
}
for (const template of missing) {
  console.log(`  + ${template.id} (insert)`);
}

if (!apply) {
  console.log('\nDry run. Re-run with --apply to write these changes.');
  process.exit(0);
}

const toRow = (template, isInsert) => ({
  template_id: template.id,
  archetype_name: template.archetypeName,
  subject: template.subject,
  body: template.body,
  recommended_service: template.recommendedService,
  booking_key: template.bookingKey,
  source: template.source || 'diagnostic',
  download_key: template.downloadKey || null,
  variant: template.variant,
  sequence_index: template.sequenceIndex,
  stage_label: template.stageLabel,
  updated_at: new Date().toISOString(),
  // Only set on insert; an existing row may have been deactivated on purpose.
  ...(isInsert ? { active: true } : {}),
});

const payload = [
  ...drifted.map((item) => toRow(item.template, false)),
  ...missing.map((template) => toRow(template, true)),
];

if (!payload.length) {
  console.log('\nNothing to write.');
  process.exit(0);
}

const upsert = await supabase.from('email_templates').upsert(payload, { onConflict: 'template_id' });
if (upsert.error) throw new Error(upsert.error.message);
console.log(`\nWrote ${payload.length} template${payload.length === 1 ? '' : 's'}.`);
