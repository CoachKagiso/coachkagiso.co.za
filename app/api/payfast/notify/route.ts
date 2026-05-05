import { NextResponse } from 'next/server';
import { asyncServices } from '@/lib/buying-flow';
import { validatePayFastSignature } from '@/lib/payfast';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { notifyKagisoPayment } from '@/lib/notifications';

export async function POST(request: Request) {
  const body = await request.text();
  const params = new URLSearchParams(body);
  const fields = Object.fromEntries(params.entries());

  if (!validatePayFastSignature(fields)) {
    console.warn('PayFast ITN rejected: invalid signature', {
      fieldNames: Object.keys(fields).sort(),
      hasSignature: Boolean(fields.signature),
      paymentId: fields.m_payment_id || fields.pf_payment_id || null,
      serviceSlug: fields.custom_str1 || null,
      paymentStatus: fields.payment_status || null,
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const paymentStatus = fields.payment_status;
  const paymentId = fields.m_payment_id || fields.pf_payment_id;
  const serviceSlug = fields.custom_str1;
  const service = asyncServices[serviceSlug as keyof typeof asyncServices];

  if (!paymentId || !service) {
    console.warn('PayFast ITN rejected: missing payment data', {
      hasPaymentId: Boolean(paymentId),
      serviceSlug: serviceSlug || null,
      paymentStatus: paymentStatus || null,
    });
    return NextResponse.json({ error: 'Missing payment data' }, { status: 400 });
  }

  const isComplete = paymentStatus === 'COMPLETE';
  const status = isComplete ? 'confirmed' : 'failed';
  const buyerName = [fields.name_first, fields.name_last].filter(Boolean).join(' ').trim();
  const buyerEmail = fields.email_address || fields.email;
  const amount = Number(fields.amount_gross || fields.amount || service.amount);
  const now = new Date().toISOString();

  if (Math.abs(amount - service.amount) > 0.01) {
    console.warn('PayFast ITN rejected: amount mismatch', {
      paymentId,
      serviceSlug: service.slug,
      receivedAmount: amount,
      expectedAmount: service.amount,
    });
    return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('payments').upsert(
    {
      payment_id: paymentId,
      service_slug: service.slug,
      amount,
      status,
      buyer_email: buyerEmail || null,
      buyer_name: buyerName || null,
      confirmed_at: isComplete ? now : null,
    },
    { onConflict: 'payment_id' },
  );

  if (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not record payment' }, { status: 500 });
  }

  if (isComplete) {
    await notifyKagisoPayment({
      service,
      name: buyerName,
      email: buyerEmail,
      timestamp: new Date(now),
    });
  }

  return new NextResponse('OK', { status: 200 });
}
