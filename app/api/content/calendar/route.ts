import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import {
  createContentCalendarItem,
  isContentCalendarStatus,
  isContentPillar,
  isContentPlatform,
  listContentCalendarItems,
} from '@/lib/content-studio';

export const dynamic = 'force-dynamic';

function isDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const items = await listContentCalendarItems();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const title = String(body?.title || '').trim();
  const pillar = String(body?.pillar || '');
  const platform = String(body?.platform || '');
  const publishDate = String(body?.publishDate || '');
  const status = String(body?.status || 'idea');

  if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  if (!isContentPillar(pillar)) return NextResponse.json({ error: 'Invalid pillar.' }, { status: 400 });
  if (!isContentPlatform(platform)) return NextResponse.json({ error: 'Invalid platform.' }, { status: 400 });
  if (!isDateInput(publishDate)) return NextResponse.json({ error: 'Publish date is required.' }, { status: 400 });
  if (!isContentCalendarStatus(status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });

  const item = await createContentCalendarItem({
    title,
    pillar,
    platform,
    publishDate,
    status,
    draftContent: body?.draftContent ? String(body.draftContent) : null,
    notes: body?.notes ? String(body.notes) : null,
  });

  revalidatePath('/resources/career-diagnostic/submissions');
  return NextResponse.json({ item });
}
