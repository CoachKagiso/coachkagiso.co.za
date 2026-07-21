import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import {
  isClientStrategyServiceSlug,
  normalizeSessionDebrief,
  type ClientStrategyServiceSlug,
} from '@/lib/client-strategy';
import {
  getClientStrategyWorkspace,
  saveClientStrategyWorkspace,
} from '@/lib/client-strategy-store';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

async function getEligiblePayment(paymentId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('payments')
    .select('payment_id, service_slug, status')
    .eq('payment_id', paymentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || data.status !== 'confirmed') return null;
  if (!isClientStrategyServiceSlug(data.service_slug)) return null;

  return {
    paymentId: String(data.payment_id),
    serviceSlug: data.service_slug as ClientStrategyServiceSlug,
  };
}

function getRequestKey(request: Request) {
  const url = new URL(request.url);
  return request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  if (!isDiagnosticAdminAuthorized(getRequestKey(request), request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId } = await params;

  try {
    const payment = await getEligiblePayment(paymentId);
    if (!payment) {
      return NextResponse.json({ error: 'Eligible confirmed engagement not found.' }, { status: 404 });
    }

    const workspace = await getClientStrategyWorkspace(payment.paymentId);
    return NextResponse.json({ workspace });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load the strategy workspace.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || request.headers.get('x-diagnostic-admin-key') || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId } = await params;

  try {
    const payment = await getEligiblePayment(paymentId);
    if (!payment) {
      return NextResponse.json({ error: 'Eligible confirmed engagement not found.' }, { status: 404 });
    }

    const debrief = normalizeSessionDebrief(body?.debrief);
    const workspace = await saveClientStrategyWorkspace({
      paymentId: payment.paymentId,
      serviceSlug: payment.serviceSlug,
      debrief,
    });

    revalidatePath('/resources/career-diagnostic/submissions');
    return NextResponse.json({ workspace });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save the strategy workspace.';
    const status = message.includes('4000 characters') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
