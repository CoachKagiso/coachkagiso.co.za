import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { deleteManualTask, isTaskStatus, isTaskType, updateManualTask } from '@/lib/dashboard-task-records';

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

  const values: Parameters<typeof updateManualTask>[1] = {};

  if (typeof body?.title === 'string') {
    const title = body.title.trim();
    if (!title) return NextResponse.json({ error: 'Task title is required.' }, { status: 400 });
    values.title = title;
  }

  if (typeof body?.type === 'string') {
    if (!isTaskType(body.type)) return NextResponse.json({ error: 'Invalid task type.' }, { status: 400 });
    values.type = body.type;
  }

  if (typeof body?.status === 'string') {
    if (!isTaskStatus(body.status)) return NextResponse.json({ error: 'Invalid task status.' }, { status: 400 });
    values.status = body.status;
  }

  if (body?.priority !== undefined) values.priority = Number(body.priority);
  if (body?.dueDate !== undefined) values.dueDate = body.dueDate || null;
  if (body?.dueTime !== undefined) values.dueTime = body.dueTime || null;
  if (body?.linkedLeadId !== undefined) values.linkedLeadId = body.linkedLeadId || null;
  if (body?.linkedPaymentId !== undefined) values.linkedPaymentId = body.linkedPaymentId || null;

  const task = await updateManualTask(id, values);
  revalidatePath('/resources/career-diagnostic/submissions');

  return NextResponse.json({ task });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await deleteManualTask(id);
  revalidatePath('/resources/career-diagnostic/submissions');

  return NextResponse.json({ ok: true });
}
