import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { approveClientStrategyPlan } from '@/lib/client-strategy-store';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string; planId: string }> },
) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || request.headers.get('x-diagnostic-admin-key') || '');
  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (body?.confirm !== true) {
    return NextResponse.json({ error: 'Approval confirmation is required.' }, { status: 400 });
  }

  const { paymentId, planId } = await params;
  try {
    const plan = await approveClientStrategyPlan({
      paymentId,
      planId,
      approvedBy: 'dashboard_admin',
    });
    if (!plan) {
      return NextResponse.json({ error: 'Only the current draft can be approved.' }, { status: 409 });
    }

    revalidatePath('/resources/career-diagnostic/submissions');
    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Strategy plan approval failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Could not approve this plan.' }, { status: 500 });
  }
}

