import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { createNote } from '@/lib/dashboard-task-records';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const noteBody = String(body?.body || '').trim();
  if (!noteBody) {
    return NextResponse.json({ error: 'Note body is required.' }, { status: 400 });
  }

  const note = await createNote({
    body: noteBody,
    linkedTaskId: body?.linkedTaskId || null,
    linkedLeadId: body?.linkedLeadId || null,
    linkedPaymentId: body?.linkedPaymentId || null,
  });

  revalidatePath('/resources/career-diagnostic/submissions');

  return NextResponse.json({ note });
}
