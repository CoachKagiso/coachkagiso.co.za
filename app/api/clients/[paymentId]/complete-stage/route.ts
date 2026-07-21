import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { ensureClientDeliveryMilestones } from '@/lib/delivery-milestones';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stageOrder = Number(body?.stageOrder);
  if (!Number.isInteger(stageOrder) || stageOrder < 1) {
    return NextResponse.json({ error: 'A valid stage order is required.' }, { status: 400 });
  }

  const { paymentId } = await params;
  const supabase = createSupabaseServiceClient();
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('payment_id, service_slug, status')
    .eq('payment_id', paymentId)
    .maybeSingle();

  if (paymentError) {
    return NextResponse.json({ error: paymentError.message }, { status: 500 });
  }

  if (!payment || payment.status !== 'confirmed') {
    return NextResponse.json({ error: 'Confirmed payment not found.' }, { status: 404 });
  }

  await ensureClientDeliveryMilestones(supabase, paymentId, String(payment.service_slug || ''));

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('client_deliveries')
    .update({ completed: true, completed_at: now })
    .eq('payment_id', paymentId)
    .eq('stage_order', stageOrder)
    .select('id, payment_id, stage_name, stage_order, completed, completed_at, created_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Delivery stage not found.' }, { status: 404 });
  }

  revalidatePath('/resources/career-diagnostic/submissions');

  return NextResponse.json({ stage: data });
}
