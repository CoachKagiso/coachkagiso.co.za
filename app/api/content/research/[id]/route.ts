import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { isContentPillar } from '@/lib/content-studio';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key ?? '');

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'ID is required.' }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body?.title !== undefined) payload.title = String(body.title).trim();
  if (body?.pillar !== undefined) {
    const pillar = String(body.pillar);
    if (!isContentPillar(pillar)) {
      return NextResponse.json({ error: 'Invalid pillar.' }, { status: 400 });
    }
    payload.pillar = pillar;
  }
  if (body?.rawContent !== undefined) payload.raw_content = String(body.rawContent);
  if (body?.sources !== undefined) {
    payload.sources = String(body.sources)
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  }
  if (body?.expiresAt !== undefined) payload.expires_at = body.expiresAt || null;
  if (body?.isEvergreen !== undefined) payload.is_evergreen = Boolean(body.isEvergreen);
  if (body?.coreInsight !== undefined) payload.core_insight = body.coreInsight || null;
  if (body?.keyFacts !== undefined) payload.key_facts = Array.isArray(body.keyFacts) ? body.keyFacts : [];
  if (body?.audienceRelevance !== undefined)
    payload.audience_relevance = body.audienceRelevance || null;
  if (body?.contentAngles !== undefined)
    payload.content_angles = Array.isArray(body.contentAngles) ? body.contentAngles : [];
  if (body?.kagisoPerspective !== undefined)
    payload.kagiso_perspective = body.kagisoPerspective || null;

  const { data, error } = await supabase
    .from('research_vault')
    .update(payload)
    .eq('id', id)
    .select(
      'id, title, pillar, raw_content, core_insight, key_facts, audience_relevance, content_angles, kagiso_perspective, sources, expires_at, is_evergreen, status, created_at, updated_at',
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'ID is required.' }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('research_vault')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
