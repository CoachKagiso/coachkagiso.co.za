import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import {
  deleteContentCalendarItem,
  isContentCalendarStatus,
  isContentPillar,
  isContentPlatform,
  updateContentCalendarItem,
} from '@/lib/content-studio';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const values: Parameters<typeof updateContentCalendarItem>[1] = {};

  if (body?.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    values.title = title;
  }

  if (body?.pillar !== undefined) {
    const pillar = String(body.pillar || '');
    if (!isContentPillar(pillar)) return NextResponse.json({ error: 'Invalid pillar.' }, { status: 400 });
    values.pillar = pillar;
  }

  if (body?.platform !== undefined) {
    const platform = String(body.platform || '');
    if (!isContentPlatform(platform)) return NextResponse.json({ error: 'Invalid platform.' }, { status: 400 });
    values.platform = platform;
  }

  if (body?.publishDate !== undefined) {
    const publishDate = String(body.publishDate || '');
    if (!isDateInput(publishDate)) return NextResponse.json({ error: 'Publish date is required.' }, { status: 400 });
    values.publishDate = publishDate;
  }

  if (body?.status !== undefined) {
    const status = String(body.status || '');
    if (!isContentCalendarStatus(status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    values.status = status;
  }

  if (body?.draftContent !== undefined) values.draftContent = body.draftContent ? String(body.draftContent) : null;
  if (body?.notes !== undefined) values.notes = body.notes ? String(body.notes) : null;

  const item = await updateContentCalendarItem(id, values);
  revalidatePath('/resources/career-diagnostic/submissions');

  return NextResponse.json({ item });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await deleteContentCalendarItem(id);
  revalidatePath('/resources/career-diagnostic/submissions');

  return NextResponse.json({ ok: true });
}
