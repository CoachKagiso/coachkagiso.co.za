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
import { pruneExpiredVaultItems } from '@/lib/content/vault-maintenance';
import { getVaultSectionForItem, vaultPolicies } from '@/lib/content/vault-policy';

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

  const { activeItems: currentItems, deletedIds } = await pruneExpiredVaultItems();
  if (deletedIds.length > 0) revalidatePath('/resources/career-diagnostic/submissions');

  const currentItem = currentItems.find((item) => item.id === id);
  if (!currentItem) return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });

  const currentSection = getVaultSectionForItem(currentItem);
  const nextSection = getVaultSectionForItem({
    source: values.source ?? currentItem.source,
    notes: values.notes !== undefined ? values.notes : currentItem.notes,
  });

  if (nextSection !== currentSection) {
    const nextCount = currentItems.filter((item) => getVaultSectionForItem(item) === nextSection).length;
    const policy = vaultPolicies[nextSection];
    if (nextCount >= policy.maxItems) {
      return NextResponse.json(
        { error: `${policy.label} is full. Delete older items before moving this idea.` },
        { status: 409 },
      );
    }
  }

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
