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
import { validatePayFastSignature } from '@/lib/payfast';
import { ensureCvReviewUpgradeCredit, getUpgradeOfferByToken, markUpgradeCreditUsed } from '@/lib/upgrade-credits';
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
    return NextResponse.json({ error: 'Invalid upgrade credit' }, { status: 400 });
  }

  if (Math.abs(amount - expectedAmount) > 0.01) {
    console.warn('PayFast ITN rejected: amount mismatch', {
      paymentId,
      serviceSlug: service.slug,
      receivedAmount: amount,
      expectedAmount,
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
