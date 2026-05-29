export type PaymentProvider = 'manual' | 'payfast' | 'peach';

export function getPaymentProvider(): PaymentProvider {
  const rawProvider = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();

  if (rawProvider === 'manual' || rawProvider === 'payfast' || rawProvider === 'peach') {
    return rawProvider;
  }

  if (process.env.PAYFAST_MODE?.trim().toLowerCase() === 'manual') {
    return 'manual';
  }

  return 'payfast';
}

export function getPaymentProviderName(provider = getPaymentProvider()) {
  if (provider === 'peach') return 'Peach Payments';
  if (provider === 'payfast') return 'PayFast';
  return 'manual payment';
}
