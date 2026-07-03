import { NextResponse } from 'next/server';
import {
  MASTERCLASS_EARLY_BIRD_AMOUNT,
  MASTERCLASS_STANDARD_AMOUNT,
  asyncServices,
  formatCurrency,
  getServiceCheckoutAmount,
} from '@/lib/buying-flow';
import { recordDashboardNotification } from '@/lib/dashboard-notifications';
import { ensureClientDeliveryMilestones } from '@/lib/delivery-milestones';
import { validatePayFastSignature, validatePayFastSignatureFromRawBody } from '@/lib/payfast';
import { ensureCvReviewUpgradeCredit, getUpgradeOfferByToken, markUpgradeCreditUsed } from '@/lib/upgrade-credits';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { notifyKagisoPayment } from '@/lib/notifications';

async function logWebhookEvent(values: {
  payment_id: string | null;
  service_slug: string | null;
  payment_status: string | null;
  result: string;
  reason: string | null;
  signature_valid: boolean;
  raw_payload: Record<string, string>;
}) {
  const supabase = createSupabaseServiceClient();
  await supabase.from('payment_webhook_events').insert({
    provider: 'payfast',
    payment_id: values.payment_id,
    service_slug: values.service_slug,
    payment_status: values.payment_status,
    result: values.result,
    reason: values.reason,
    signature_valid: values.signature_valid,
    raw_payload: values.raw_payload,
  });
}

export async function POST(request: Request) {
  const body = await request.text();

  // Log the raw POST body so we can reproduce the signature exactly.
  // PayFast signs using the raw URL-encoded field values in POST body order.
  // This log helps diagnose any signature mismatch — compare with Vercel logs.
  console.info('PayFast ITN raw body:', body);

  const params = new URLSearchParams(body);
  const fields = Object.fromEntries(params.entries());

  const paymentId = fields.m_payment_id || fields.pf_payment_id || null;
  const serviceSlug = fields.custom_str1 || null;
  const paymentStatus = fields.payment_status || null;

  // Validate signature against the raw body first (most accurate — avoids decode/re-encode).
  // Fall back to the re-encoded approach for safety.
  const signatureValid =
    validatePayFastSignatureFromRawBody(body, fields.signature || '') ||
    validatePayFastSignature(fields);

  if (!signatureValid) {
    console.warn('PayFast ITN rejected: invalid signature', {
      fieldNames: Object.keys(fields).sort(),
      hasSignature: Boolean(fields.signature),
      paymentId,
      serviceSlug,
      paymentStatus,
    });
    await logWebhookEvent({
      payment_id: paymentId,
      service_slug: serviceSlug,
      payment_status: paymentStatus,
      result: 'rejected',
      reason: 'invalid_signature',
      signature_valid: false,
      raw_payload: fields,
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const service = asyncServices[serviceSlug as keyof typeof asyncServices];

  if (!paymentId || !service) {
    console.warn('PayFast ITN rejected: missing payment data', {
      hasPaymentId: Boolean(paymentId),
      serviceSlug,
      paymentStatus,
    });
    await logWebhookEvent({
      payment_id: paymentId,
      service_slug: serviceSlug,
      payment_status: paymentStatus,
      result: 'rejected',
      reason: 'missing_payment_data',
      signature_valid: true,
      raw_payload: fields,
    });
    return NextResponse.json({ error: 'Missing payment data' }, { status: 400 });
  }

  const isComplete = paymentStatus === 'COMPLETE';
  const status = isComplete ? 'confirmed' : 'failed';
  const buyerName = [fields.name_first, fields.name_last].filter(Boolean).join(' ').trim();
  const buyerEmail = fields.email_address || fields.email;
  const amount = Number(fields.amount_gross || fields.amount || service.amount);
  const upgradeToken = fields.custom_str2 || '';
  const now = new Date().toISOString();
  const upgradeOffer =
    service.slug === 'cv-revamp' && upgradeToken
      ? await getUpgradeOfferByToken(upgradeToken, 'cv-revamp')
      : null;
  const signedCheckoutAmount = Number(fields.custom_str3 || '');
  const expectedAmount =
    upgradeOffer?.valid
      ? upgradeOffer.credit.discounted_amount
      : service.slug === 'masterclass' &&
          (signedCheckoutAmount === MASTERCLASS_EARLY_BIRD_AMOUNT || signedCheckoutAmount === MASTERCLASS_STANDARD_AMOUNT)
        ? signedCheckoutAmount
        : getServiceCheckoutAmount(service);

  if (service.slug === 'cv-revamp' && upgradeToken && !upgradeOffer?.valid) {
    console.warn('PayFast ITN rejected: invalid upgrade credit', {
      paymentId,
      upgradeToken,
      reason: upgradeOffer?.reason || 'missing',
    });
    await logWebhookEvent({
      payment_id: paymentId,
      service_slug: serviceSlug,
      payment_status: paymentStatus,
      result: 'rejected',
      reason: `invalid_upgrade_credit:${upgradeOffer?.reason || 'missing'}`,
      signature_valid: true,
      raw_payload: fields,
    });
    return NextResponse.json({ error: 'Invalid upgrade credit' }, { status: 400 });
  }

  if (Math.abs(amount - expectedAmount) > 0.01) {
    console.warn('PayFast ITN rejected: amount mismatch', {
      paymentId,
      serviceSlug: service.slug,
      receivedAmount: amount,
      expectedAmount,
    });
    await logWebhookEvent({
      payment_id: paymentId,
      service_slug: serviceSlug,
      payment_status: paymentStatus,
      result: 'rejected',
      reason: `amount_mismatch:received=${amount},expected=${expectedAmount}`,
      signature_valid: true,
      raw_payload: fields,
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
    await logWebhookEvent({
      payment_id: paymentId,
      service_slug: service.slug,
      payment_status: paymentStatus,
      result: 'error',
      reason: `db_error:${error.message}`,
      signature_valid: true,
      raw_payload: fields,
    });
    return NextResponse.json({ error: 'Could not record payment' }, { status: 500 });
  }

  await logWebhookEvent({
    payment_id: paymentId,
    service_slug: service.slug,
    payment_status: paymentStatus,
    result: 'accepted',
    reason: null,
    signature_valid: true,
    raw_payload: fields,
  });

  if (isComplete) {
    await ensureClientDeliveryMilestones(supabase, paymentId, service.slug);

    if (service.slug === 'cv-review') {
      await ensureCvReviewUpgradeCredit({
        paymentId,
        buyerEmail,
        buyerName,
        confirmedAt: now,
      });
    }

    if (upgradeOffer?.valid) {
      await markUpgradeCreditUsed(upgradeOffer.credit.token, paymentId);
    }

    await notifyKagisoPayment({
      service,
      name: buyerName,
      email: buyerEmail,
      amount,
      timestamp: new Date(now),
    });

    await recordDashboardNotification({
      eventType: 'payment_confirmed',
      source: 'payfast-itn',
      title: `New payment - ${service.title}`,
      description: `${buyerName || 'A client'} paid ${formatCurrency(amount)} for ${service.title}. Watch for the intake form.`,
      contactName: buyerName || null,
      contactEmail: buyerEmail || null,
      href: buyerEmail ? `mailto:${buyerEmail}?subject=${encodeURIComponent(`Next steps for ${service.title}`)}` : null,
      metadata: {
        paymentId,
        serviceSlug: service.slug,
        amount,
        status,
        upgradeToken: upgradeToken || null,
      },
    });
  }

  return new NextResponse('OK', { status: 200 });
}
