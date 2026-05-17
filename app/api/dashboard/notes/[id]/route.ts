import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { deleteNote, updateNote } from '@/lib/dashboard-task-records';

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

  const noteBody = String(body?.body || '').trim();
  if (!noteBody) {
    return NextResponse.json({ error: 'Note body is required.' }, { status: 400 });
  }

  const note = await updateNote(id, noteBody);
  revalidatePath('/resources/career-diagnostic/submissions');

  return NextResponse.json({ note });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await deleteNote(id);
  revalidatePath('/resources/career-diagnostic/submissions');

  return NextResponse.json({ ok: true });
}
