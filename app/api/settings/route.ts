import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { loadSettings, mergeAiConfigForSave, stripSecretsFromSettings, upsertSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const adminKey = url.searchParams.get('key') || '';

  if (!isDiagnosticAdminAuthorized(adminKey, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const settings = await loadSettings(supabase);
  return NextResponse.json({ settings: stripSecretsFromSettings(settings) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const adminKey = String(body?.adminKey || body?.accessKey || '');

  if (!isDiagnosticAdminAuthorized(adminKey, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settingKey = String(body?.settingKey || body?.key || '').trim();
  if (!settingKey) {
    return NextResponse.json({ error: 'Settings key is required.' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const settings = settingKey === 'ai_config' ? await loadSettings(supabase) : null;
  const value = settingKey === 'ai_config'
    ? mergeAiConfigForSave(settings?.ai_config, body?.value)
    : body?.value;
  await upsertSetting(supabase, settingKey, value);

  return NextResponse.json({ success: true });
}
