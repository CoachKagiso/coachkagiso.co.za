import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { createManualTask, isTaskStatus, isTaskType } from '@/lib/dashboard-task-records';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const title = String(body?.title || '').trim();
  const type = String(body?.type || '');
  const status = String(body?.status || 'todo');

  if (!title) {
    return NextResponse.json({ error: 'Task title is required.' }, { status: 400 });
  }

  if (!isTaskType(type)) {
    return NextResponse.json({ error: 'Invalid task type.' }, { status: 400 });
  }

  if (!isTaskStatus(status)) {
    return NextResponse.json({ error: 'Invalid task status.' }, { status: 400 });
  }

  const task = await createManualTask({
    title,
    type,
    status,
    priority: Number(body?.priority || 50),
    dueDate: body?.dueDate || null,
    dueTime: body?.dueTime || null,
    linkedLeadId: body?.linkedLeadId || null,
    linkedPaymentId: body?.linkedPaymentId || null,
  });

  revalidatePath('/resources/career-diagnostic/submissions');

  return NextResponse.json({ task });
}
