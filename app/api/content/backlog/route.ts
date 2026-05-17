import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import {
  createContentBacklogItem,
  isContentBacklogSource,
  isContentBacklogStatus,
  isContentPillar,
  isContentPlatform,
  listContentBacklogItems,
  type ContentPillar,
  type ContentPlatform,
} from '@/lib/content-studio';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const items = await listContentBacklogItems();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const title = String(body?.title || '').trim();
  const pillar = body?.pillar ? String(body.pillar) : null;
  const platform = body?.platform ? String(body.platform) : null;
  const status = String(body?.status || 'idea');
  const source = String(body?.source || 'manual');

  if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  let normalizedPillar: ContentPillar | null = null;
  if (pillar) {
    if (!isContentPillar(pillar)) return NextResponse.json({ error: 'Invalid pillar.' }, { status: 400 });
    normalizedPillar = pillar;
  }
  let normalizedPlatform: ContentPlatform | null = null;
  if (platform) {
    if (!isContentPlatform(platform)) return NextResponse.json({ error: 'Invalid platform.' }, { status: 400 });
    normalizedPlatform = platform;
  }
  if (!isContentBacklogStatus(status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  if (!isContentBacklogSource(source)) return NextResponse.json({ error: 'Invalid source.' }, { status: 400 });

  const item = await createContentBacklogItem({
    title,
    pillar: normalizedPillar,
    platform: normalizedPlatform,
    status,
    source,
    content: body?.content ? String(body.content) : null,
    notes: body?.notes ? String(body.notes) : null,
  });

  revalidatePath('/resources/career-diagnostic/submissions');
  return NextResponse.json({ item });
}
