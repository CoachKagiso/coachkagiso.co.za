import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import {
  deleteContentBacklogItem,
  isContentBacklogSource,
  isContentBacklogStatus,
  isContentPillar,
  isContentPlatform,
  updateContentBacklogItem,
} from '@/lib/content-studio';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const values: Parameters<typeof updateContentBacklogItem>[1] = {};

  if (body?.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    values.title = title;
  }

  if (body?.pillar !== undefined) {
    const pillar = body.pillar ? String(body.pillar) : null;
    if (!pillar) {
      values.pillar = null;
    } else {
      if (!isContentPillar(pillar)) return NextResponse.json({ error: 'Invalid pillar.' }, { status: 400 });
      values.pillar = pillar;
    }
  }

  if (body?.platform !== undefined) {
    const platform = body.platform ? String(body.platform) : null;
    if (!platform) {
      values.platform = null;
    } else {
      if (!isContentPlatform(platform)) return NextResponse.json({ error: 'Invalid platform.' }, { status: 400 });
      values.platform = platform;
    }
  }

  if (body?.status !== undefined) {
    const status = String(body.status || '');
    if (!isContentBacklogStatus(status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    values.status = status;
  }

  if (body?.source !== undefined) {
    const source = String(body.source || '');
    if (!isContentBacklogSource(source)) return NextResponse.json({ error: 'Invalid source.' }, { status: 400 });
    values.source = source;
  }

  if (body?.content !== undefined) values.content = body.content ? String(body.content) : null;
  if (body?.notes !== undefined) values.notes = body.notes ? String(body.notes) : null;

  const item = await updateContentBacklogItem(id, values);
  revalidatePath('/resources/career-diagnostic/submissions');

  return NextResponse.json({ item });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await deleteContentBacklogItem(id);
  revalidatePath('/resources/career-diagnostic/submissions');

  return NextResponse.json({ ok: true });
}
