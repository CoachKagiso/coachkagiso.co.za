import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { EMAIL_TEMPLATES } from '@/lib/email-templates';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import {
  listStoredEmailTemplates,
  setArchetypeTemplatesActive,
  updateStoredEmailTemplate,
} from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const adminKey = url.searchParams.get('key') || '';

  if (!isDiagnosticAdminAuthorized(adminKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const templates = await listStoredEmailTemplates(supabase);
  return NextResponse.json({ templates });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const adminKey = String(body?.adminKey || body?.key || '');

  if (!isDiagnosticAdminAuthorized(adminKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();

  if (body?.intent === 'set_archetype_active') {
    const archetypeName = String(body?.archetypeName || '').trim();
    if (!archetypeName) {
      return NextResponse.json({ error: 'Archetype is required.' }, { status: 400 });
    }

    const templates = await setArchetypeTemplatesActive(supabase, archetypeName, Boolean(body?.active));
    return NextResponse.json({ templates });
  }

  const templateId = String(body?.templateId || '').trim();
  if (!templateId) {
    return NextResponse.json({ error: 'Template id is required.' }, { status: 400 });
  }

  if (body?.intent === 'reset_default') {
    const fallback = EMAIL_TEMPLATES.find((template) => template.id === templateId);
    if (!fallback) {
      return NextResponse.json({ error: 'Default template not found.' }, { status: 404 });
    }

    const template = await updateStoredEmailTemplate(supabase, templateId, {
      subject: fallback.subject,
      body: fallback.body,
    });
    return NextResponse.json({ template });
  }

  const subject = typeof body?.subject === 'string' ? body.subject : undefined;
  const templateBody = typeof body?.body === 'string' ? body.body : undefined;
  const active = typeof body?.active === 'boolean' ? body.active : undefined;

  if (subject === undefined && templateBody === undefined && active === undefined) {
    return NextResponse.json({ error: 'No template updates supplied.' }, { status: 400 });
  }

  const template = await updateStoredEmailTemplate(supabase, templateId, {
    subject,
    body: templateBody,
    active,
  });

  return NextResponse.json({ template });
}
