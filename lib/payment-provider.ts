export type PaymentProvider = 'manual' | 'payfast';

export function getPaymentProvider(): PaymentProvider {
  const rawProvider = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();

  if (rawProvider === 'manual' || rawProvider === 'payfast') {
    return rawProvider;
  }

  if (process.env.PAYFAST_MODE?.trim().toLowerCase() === 'manual') {
    return 'manual';
  }

  return 'payfast';
}

export function getPaymentProviderName(provider = getPaymentProvider()) {
  if (provider === 'payfast') return 'PayFast';
  return 'manual payment';
}
