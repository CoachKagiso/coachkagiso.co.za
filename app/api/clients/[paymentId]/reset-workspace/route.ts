import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { resetClientWorkspace } from '@/lib/client-workspace-reset';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || request.headers.get('x-diagnostic-admin-key') || '');
  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!body?.confirmation || body.confirmation !== body.expectedConfirmation) {
    return NextResponse.json({ error: 'The reset confirmation phrase did not match.' }, { status: 400 });
  }
  const { paymentId } = await params;
  try {
    const summary = await resetClientWorkspace(paymentId);
    revalidatePath('/resources/career-diagnostic/submissions');
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Client workspace reset failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Could not reset this client workspace.' }, { status: 500 });
  }
}
