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
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const paymentStatus = fields.payment_status;
  const paymentId = fields.m_payment_id || fields.pf_payment_id;
  const serviceSlug = fields.custom_str1;
  const service = asyncServices[serviceSlug as keyof typeof asyncServices];

  if (!paymentId || !service) {
    return NextResponse.json({ error: 'Missing payment data' }, { status: 400 });
  }

  const isComplete = paymentStatus === 'COMPLETE';
  const status = isComplete ? 'confirmed' : 'failed';
  const buyerName = [fields.name_first, fields.name_last].filter(Boolean).join(' ').trim();
  const buyerEmail = fields.email_address || fields.email;
  const amount = Number(fields.amount_gross || fields.amount || service.amount);
  const now = new Date().toISOString();

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
