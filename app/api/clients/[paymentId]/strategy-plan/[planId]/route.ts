import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { normalizeClientStrategyPlanContent } from '@/lib/client-strategy-plan';
import { getClientStrategyGenerationSource, updateClientStrategyPlanDraft } from '@/lib/client-strategy-store';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ paymentId: string; planId: string }> },
) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || request.headers.get('x-diagnostic-admin-key') || '');
  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId, planId } = await params;
  try {
    const source = await getClientStrategyGenerationSource(paymentId);
    if (!source) {
      return NextResponse.json({ error: 'Eligible confirmed engagement not found.' }, { status: 404 });
    }
    const editedContent = normalizeClientStrategyPlanContent(source.serviceSlug, body?.content);
    const plan = await updateClientStrategyPlanDraft({ paymentId, planId, editedContent });
    if (!plan) {
      return NextResponse.json({ error: 'Only the current draft can be edited.' }, { status: 409 });
    }

    revalidatePath('/resources/career-diagnostic/submissions');
    return NextResponse.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('required') || message.includes('characters or fewer') || message.includes('schema')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('Strategy plan update failed:', message || 'unknown error');
    return NextResponse.json({ error: 'Could not save the plan changes.' }, { status: 500 });
  }
}

