import { NextResponse } from 'next/server';
import {
  MASTERCLASS_EARLY_BIRD_AMOUNT,
  MASTERCLASS_STANDARD_AMOUNT,
  getAsyncService,
  getServiceCheckoutAmount,
} from '@/lib/buying-flow';
import { createPayFastCheckoutFields, getPayFastProcessUrl } from '@/lib/payfast';
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

  const checkoutAmount = upgradeOffer?.valid
    ? upgradeOffer.credit.discounted_amount
    : getServiceCheckoutAmount(service);

  const supabase = createSupabaseServiceClient();
  const { error: pendingError } = await supabase.from('payments').upsert(
    {
      payment_id: paymentId,
      service_slug: service.slug,
      amount: checkoutAmount,
      status: 'pending',
    },
    { onConflict: 'payment_id' },
  );

  if (pendingError) {
    console.error('PayFast checkout: failed to create pending payment', pendingError);
    return NextResponse.json({ error: 'Could not prepare checkout' }, { status: 500 });
  }

  const customFields: Record<string, string> = {};
  if (upgradeOffer?.valid) {
    customFields.custom_str2 = upgradeOffer.credit.token;
  }
  if (service.slug === 'masterclass') {
    customFields.custom_str3 = checkoutAmount.toFixed(2);
  }

  const fields = createPayFastCheckoutFields(service, paymentId, {
    amountOverride: checkoutAmount,
    customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    extraReturnParams: upgradeOffer?.valid ? { upgrade_token: upgradeOffer.credit.token } : undefined,
  });

  const formInputs = Object.entries(fields)
    .map(([key, value]) => `<input type="hidden" name="${key}" value="${value}"/>`)
    .join('');

  const html = `<!DOCTYPE html><html><head><title>Redirecting to PayFast…</title></head><body onload="document.forms[0].submit()"><form action="${getPayFastProcessUrl()}" method="post">${formInputs}<noscript><button type="submit">Continue to PayFast</button></noscript></form></body></html>`;

  return new NextResponse(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
