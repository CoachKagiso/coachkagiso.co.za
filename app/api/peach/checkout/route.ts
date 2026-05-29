import { NextResponse } from 'next/server';
import { getAsyncService } from '@/lib/buying-flow';
import { createPeachCheckout, createPeachMerchantTransactionId } from '@/lib/peach';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { getUpgradeOfferByToken } from '@/lib/upgrade-credits';

export async function POST(request: Request) {
  const formData = await request.formData();
  const serviceSlug = String(formData.get('service_slug') || '');
  const paymentId = String(formData.get('payment_id') || '');
  const upgradeToken = String(formData.get('upgrade_token') || '');
  const service = getAsyncService(serviceSlug);

  if (!service || !paymentId.startsWith(`${serviceSlug}-`)) {
    return NextResponse.json({ error: 'Invalid checkout request' }, { status: 400 });
  }

  const upgradeOffer =
    service.slug === 'cv-revamp' && upgradeToken
      ? await getUpgradeOfferByToken(upgradeToken, 'cv-revamp')
      : null;

  if (service.slug === 'cv-revamp' && upgradeToken && !upgradeOffer?.valid) {
    return NextResponse.json({ error: 'Invalid upgrade credit' }, { status: 400 });
  }

  const amount = upgradeOffer?.valid ? upgradeOffer.credit.discounted_amount : service.amount;
  const merchantTransactionId = createPeachMerchantTransactionId();
  const supabase = createSupabaseServiceClient();
  const pendingPayload = {
    payment_id: paymentId,
    service_slug: service.slug,
    amount,
    status: 'pending',
    payment_provider: 'peach',
    provider_payment_id: merchantTransactionId,
    provider_status: 'created',
  };

  const { error: pendingError } = await supabase.from('payments').upsert(pendingPayload, { onConflict: 'payment_id' });
  if (pendingError) {
    console.error('Peach checkout: failed to create pending payment', pendingError);
    return NextResponse.json({ error: 'Could not prepare checkout' }, { status: 500 });
  }

  try {
    const checkout = await createPeachCheckout(service, paymentId, merchantTransactionId, {
      amountOverride: amount,
      upgradeToken: upgradeOffer?.valid ? upgradeOffer.credit.token : undefined,
    });

    const { error: updateError } = await supabase
      .from('payments')
      .update({
        provider_checkout_id: checkout.checkoutId || null,
        provider_payload: {
          checkoutRequest: checkout.request,
          checkoutResponse: checkout.response,
        },
      })
      .eq('payment_id', paymentId);

    if (updateError) {
      console.error('Peach checkout: failed to store checkout response', updateError);
      return NextResponse.json({ error: 'Could not store checkout reference' }, { status: 500 });
    }

    return NextResponse.redirect(checkout.redirectUrl, { status: 303 });
  } catch (error) {
    console.error('Peach checkout failed', error);
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        provider_status: 'checkout_creation_failed',
        provider_result_description: error instanceof Error ? error.message : 'Peach checkout creation failed',
      })
      .eq('payment_id', paymentId);

    return NextResponse.json({ error: 'Could not start Peach checkout' }, { status: 502 });
  }
}
