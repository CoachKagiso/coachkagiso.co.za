import { asyncServices, formatCurrency } from '@/lib/buying-flow';
import { recordDashboardNotification } from '@/lib/dashboard-notifications';
import { ensureClientDeliveryMilestones } from '@/lib/delivery-milestones';
import { notifyKagisoPayment } from '@/lib/notifications';
import {
  getPeachAuxData,
  getPeachBuyerEmail,
  getPeachBuyerName,
  getPeachPaymentStatus,
  getPeachResultCode,
  getPeachResultDescription,
} from '@/lib/peach';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { ensureCvReviewUpgradeCredit, getUpgradeOfferByToken, markUpgradeCreditUsed } from '@/lib/upgrade-credits';

type PeachFields = Record<string, string>;

type ExistingPayment = {
  payment_id: string;
  service_slug: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  buyer_email: string | null;
  buyer_name: string | null;
  confirmed_at: string | null;
  provider_payment_id?: string | null;
  provider_checkout_id?: string | null;
};

async function findExistingPayment(fields: PeachFields, auxData: ReturnType<typeof getPeachAuxData>) {
  const supabase = createSupabaseServiceClient();
  const checkoutId = fields.checkoutId || '';
  const merchantTransactionId = fields.merchantTransactionId || '';

  if (checkoutId) {
    const { data } = await supabase
      .from('payments')
      .select('payment_id, service_slug, amount, status, buyer_email, buyer_name, confirmed_at, provider_payment_id, provider_checkout_id')
      .eq('payment_provider', 'peach')
      .eq('provider_checkout_id', checkoutId)
      .maybeSingle();

    if (data) return data as ExistingPayment;
  }

  if (merchantTransactionId) {
    const { data } = await supabase
      .from('payments')
      .select('payment_id, service_slug, amount, status, buyer_email, buyer_name, confirmed_at, provider_payment_id, provider_checkout_id')
      .eq('payment_provider', 'peach')
      .eq('provider_payment_id', merchantTransactionId)
      .maybeSingle();

    if (data) return data as ExistingPayment;
  }

  if (auxData.paymentId) {
    const { data } = await supabase
      .from('payments')
      .select('payment_id, service_slug, amount, status, buyer_email, buyer_name, confirmed_at, provider_payment_id, provider_checkout_id')
      .eq('payment_id', auxData.paymentId)
      .maybeSingle();

    if (data) return data as ExistingPayment;
  }

  return null;
}

export async function recordPeachPaymentResult(fields: PeachFields, source: 'peach-webhook' | 'peach-return') {
  const auxData = getPeachAuxData(fields);
  const existing = await findExistingPayment(fields, auxData);
  const paymentId = existing?.payment_id || auxData.paymentId || '';
  const serviceSlug = existing?.service_slug || auxData.serviceSlug || '';
  const service = asyncServices[serviceSlug as keyof typeof asyncServices];

  if (!paymentId || !service) {
    return {
      ok: false,
      paymentId,
      serviceSlug,
      status: 'failed' as const,
      error: 'Missing Peach payment mapping',
    };
  }

  const rawStatus = getPeachPaymentStatus(fields);
  if (existing?.status === 'confirmed' && rawStatus !== 'confirmed') {
    return {
      ok: true,
      paymentId,
      serviceSlug: service.slug,
      status: 'confirmed' as const,
    };
  }

  const status = rawStatus;
  const resultCode = getPeachResultCode(fields);
  const resultDescription = getPeachResultDescription(fields);
  const amount = Number(fields.amount || existing?.amount || service.amount);
  const upgradeToken = auxData.upgradeToken || '';
  const upgradeOffer =
    service.slug === 'cv-revamp' && upgradeToken
      ? await getUpgradeOfferByToken(upgradeToken, 'cv-revamp')
      : null;
  const expectedAmount = existing?.amount || (upgradeOffer?.valid ? upgradeOffer.credit.discounted_amount : service.amount);

  if (Math.abs(amount - Number(expectedAmount)) > 0.01) {
    return {
      ok: false,
      paymentId,
      serviceSlug: service.slug,
      status: 'failed' as const,
      error: 'Payment amount mismatch',
    };
  }

  const now = new Date().toISOString();
  const buyerName = getPeachBuyerName(fields) || existing?.buyer_name || '';
  const buyerEmail = getPeachBuyerEmail(fields) || existing?.buyer_email || '';
  const wasAlreadyConfirmed = existing?.status === 'confirmed';
  const confirmedAt = status === 'confirmed' ? existing?.confirmed_at || now : existing?.confirmed_at || null;
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('payments').upsert(
    {
      payment_id: paymentId,
      service_slug: service.slug,
      amount,
      status,
      buyer_email: buyerEmail || null,
      buyer_name: buyerName || null,
      confirmed_at: confirmedAt,
      payment_provider: 'peach',
      provider_payment_id: fields.merchantTransactionId || existing?.provider_payment_id || null,
      provider_checkout_id: fields.checkoutId || existing?.provider_checkout_id || null,
      provider_transaction_id: fields.id || null,
      provider_status: status,
      provider_result_code: resultCode || null,
      provider_result_description: resultDescription || null,
      provider_payload: fields,
    },
    { onConflict: 'payment_id' },
  );

  if (error) {
    return {
      ok: false,
      paymentId,
      serviceSlug: service.slug,
      status,
      error: error.message,
    };
  }

  if (status === 'confirmed' && !wasAlreadyConfirmed) {
    await ensureClientDeliveryMilestones(supabase, paymentId, service.slug);

    if (service.slug === 'cv-review') {
      await ensureCvReviewUpgradeCredit({
        paymentId,
        buyerEmail,
        buyerName,
        confirmedAt,
      });
    }

    if (upgradeOffer?.valid) {
      await markUpgradeCreditUsed(upgradeOffer.credit.token, paymentId);
    }

    await notifyKagisoPayment({
      service,
      name: buyerName,
      email: buyerEmail,
      timestamp: new Date(confirmedAt || now),
    });

    await recordDashboardNotification({
      eventType: 'payment_confirmed',
      source,
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
        provider: 'peach',
        checkoutId: fields.checkoutId || null,
        merchantTransactionId: fields.merchantTransactionId || null,
        resultCode: resultCode || null,
        resultDescription: resultDescription || null,
      },
    });
  }

  return {
    ok: true,
    paymentId,
    serviceSlug: service.slug,
    status,
  };
}
