import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getIncompleteClientStrategyPlanSections } from '@/lib/client-strategy-plan';
import { approveClientStrategyPlan, getClientStrategyPlan } from '@/lib/client-strategy-store';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { completeClientStrategyFulfillmentItems } from '@/lib/client-strategy-fulfillment';

const SECTION_LABELS = {
  session_summary: 'Session Summary & Agreements',
  development_plan: 'Career Development Plan',
  interview_prep: 'Interview Preparation',
} as const;

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
    const existingPlan = await getClientStrategyPlan(paymentId, planId);
    if (!existingPlan || existingPlan.status !== 'draft') {
      return NextResponse.json({ error: 'Only the current draft can be approved.' }, { status: 409 });
    }
    const incompleteSections = getIncompleteClientStrategyPlanSections(existingPlan.editedContent);
    if (incompleteSections.length) {
      return NextResponse.json(
        {
          error: `Generate every required section before approval. Still needed: ${incompleteSections.map((section) => SECTION_LABELS[section]).join(', ')}.`,
          incompleteSections,
        },
        { status: 409 },
      );
    }

    const plan = await approveClientStrategyPlan({
      paymentId,
      planId,
      approvedBy: 'dashboard_admin',
    });
    if (!plan) {
      return NextResponse.json({ error: 'Only the current draft can be approved.' }, { status: 409 });
    }
    await completeClientStrategyFulfillmentItems(paymentId, plan.serviceSlug, [
      'session_summary_finalised',
      'development_plan_finalised',
      ...(plan.serviceSlug === 'glow-up-vip' ? ['interview_preparation_finalised'] : []),
    ]);

    revalidatePath('/resources/career-diagnostic/submissions');
    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Strategy plan approval failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Could not approve this plan.' }, { status: 500 });
  }
}
