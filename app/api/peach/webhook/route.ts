import { NextResponse } from 'next/server';
import { parsePeachRequestFields, validatePeachSignature } from '@/lib/peach';
import { recordPeachPaymentResult } from '@/lib/peach-payment-result';

export async function POST(request: Request) {
  const fields = await parsePeachRequestFields(request);

  if (!validatePeachSignature(fields)) {
    console.warn('Peach webhook rejected: invalid signature', {
      fieldNames: Object.keys(fields).sort(),
      hasSignature: Boolean(fields.signature),
      checkoutId: fields.checkoutId || null,
      merchantTransactionId: fields.merchantTransactionId || null,
      resultCode: fields['result.code'] || fields.result_code || null,
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const result = await recordPeachPaymentResult(fields, 'peach-webhook');

  if (!result.ok) {
    console.warn('Peach webhook could not be recorded', result);
    return NextResponse.json({ error: result.error || 'Could not record payment' }, { status: 400 });
  }

  return new NextResponse('OK', { status: 200 });
}
