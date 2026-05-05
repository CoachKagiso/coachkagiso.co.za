import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();
const envPath = path.join(root, '.env.local');

if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (!process.env[key]) {
      process.env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = (process.argv.find((arg) => arg.startsWith('--base-url='))?.split('=')[1] || 'http://localhost:4000').replace(/\/$/, '');
const bucket = 'diagnostic-playbooks';
const slugs = [
  'plateaued-performer',
  'quiet-pivoter',
  'burnt-out-builder',
  'lost-pivoter',
  'engaged-strategist',
];

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function ensureBucket() {
  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    allowedMimeTypes: ['application/pdf'],
    fileSizeLimit: '10MB',
  });

  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

async function publishPlaybook(slug) {
  const response = await fetch(`${baseUrl}/api/diagnostic/playbook-pdf/${slug}?fresh=1`);

  if (!response.ok) {
    throw new Error(`Could not generate ${slug}: ${response.status} ${response.statusText}`);
  }

  const pdf = Buffer.from(await response.arrayBuffer());
  const filePath = `${slug}-playbook.pdf`;
  const { error } = await supabase.storage.from(bucket).upload(filePath, pdf, {
    contentType: 'application/pdf',
    cacheControl: '3600',
    upsert: true,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

await ensureBucket();

const published = [];
for (const slug of slugs) {
  const publicUrl = await publishPlaybook(slug);
  published.push({ slug, publicUrl });
}

console.log(JSON.stringify({ bucket, published }, null, 2));
