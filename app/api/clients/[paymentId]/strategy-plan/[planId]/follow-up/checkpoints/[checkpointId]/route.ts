import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { normalizeClientStrategyCheckpointOutcome } from '@/lib/client-strategy-follow-up';
import {
  getClientStrategyFollowUpState,
  getClientStrategyThemeReport,
  saveClientStrategyCheckpointOutcome,
} from '@/lib/client-strategy-follow-up-store';
import { getClientStrategyPlan } from '@/lib/client-strategy-store';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ paymentId: string; planId: string; checkpointId: string }> },
) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || request.headers.get('x-diagnostic-admin-key') || '');
  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let outcome;
  try {
    outcome = normalizeClientStrategyCheckpointOutcome(body);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Check the outcome details.' },
      { status: 400 },
    );
  }

  const { paymentId, planId, checkpointId } = await params;
  try {
    const [plan, followUp] = await Promise.all([
      getClientStrategyPlan(paymentId, planId),
      getClientStrategyFollowUpState(paymentId, planId),
    ]);
    if (!plan) return NextResponse.json({ error: 'Strategy plan not found.' }, { status: 404 });
    if (plan.status !== 'sent') {
      return NextResponse.json({ error: 'Follow-up outcomes can only be saved after delivery.' }, { status: 409 });
    }
    if (!followUp.checkpoints.some((checkpoint) => checkpoint.id === checkpointId)) {
      return NextResponse.json({ error: 'Strategy checkpoint not found.' }, { status: 404 });
    }

    const checkpoint = await saveClientStrategyCheckpointOutcome(checkpointId, outcome);
    const themeReport = await getClientStrategyThemeReport();
    revalidatePath('/resources/career-diagnostic/submissions');
    return NextResponse.json({ checkpoint, themeReport });
  } catch {
    console.error('Strategy checkpoint outcome save failed.');
    return NextResponse.json({ error: 'Could not save the checkpoint outcome.' }, { status: 500 });
  }
}
