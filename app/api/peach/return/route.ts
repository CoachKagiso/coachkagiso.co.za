import { NextResponse } from 'next/server';
import { parsePeachRequestFields, validatePeachSignature } from '@/lib/peach';
import { recordPeachPaymentResult } from '@/lib/peach-payment-result';
import { getSiteUrl } from '@/lib/env';

export async function POST(request: Request) {
  const fields = await parsePeachRequestFields(request);

  if (!validatePeachSignature(fields)) {
    console.warn('Peach return rejected: invalid signature', {
      fieldNames: Object.keys(fields).sort(),
      hasSignature: Boolean(fields.signature),
      checkoutId: fields.checkoutId || null,
      merchantTransactionId: fields.merchantTransactionId || null,
      resultCode: fields['result.code'] || fields.result_code || null,
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const result = await recordPeachPaymentResult(fields, 'peach-return');
  const siteUrl = getSiteUrl();

  if (result.ok && result.status === 'confirmed') {
    return NextResponse.redirect(
      `${siteUrl}/thanks/${result.serviceSlug}?payment_id=${encodeURIComponent(result.paymentId)}`,
      { status: 303 },
    );
  }

  if (result.serviceSlug) {
    return NextResponse.redirect(`${siteUrl}/buy/${result.serviceSlug}/failed`, { status: 303 });
  }

  return NextResponse.redirect(`${siteUrl}/work-with-me`, { status: 303 });
}

export function GET() {
  return NextResponse.redirect(`${getSiteUrl()}/work-with-me`, { status: 303 });
}
