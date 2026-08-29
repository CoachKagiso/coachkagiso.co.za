export type PaymentBrandLogo = {
  name: string;
  /** Omit while we are still waiting on the provider's logo asset. */
  src?: string;
  width?: number;
  height?: number;
  displayClassName?: string;
};

export const paymentProcessorLogo = {
  name: 'PayFast by Network',
  src: '/Payfast logo.png',
} as const;

export const paymentMethodLogos: PaymentBrandLogo[] = [
  {
    name: 'Visa',
    src: '/Visa.png',
    width: 186,
    height: 61,
    displayClassName: 'h-5 w-auto',
  },
  {
    name: 'Mastercard',
    src: '/Master Card.png',
    width: 100,
    height: 61,
    displayClassName: 'h-6 w-auto',
  },
  {
    name: 'Instant EFT',
    src: '/instantEFT_hi-Res_logo_png.png',
    width: 1513,
    height: 512,
    displayClassName: 'h-6 w-auto',
  },
  {
    name: 'Apple Pay',
    src: '/Apple Pay.png',
    width: 2560,
    height: 1050,
    displayClassName: 'h-6 w-auto',
  },
  {
    name: 'Google Pay',
    src: '/google-pay.png',
    width: 5900,
    height: 2412,
    displayClassName: 'h-6 w-auto',
  },
  {
    name: 'Mobicred',
    src: '/mobicred_logoMark_grp.png',
    width: 441,
    height: 86,
    displayClassName: 'h-5 w-auto',
  },
  {
    name: 'RCS',
    src: '/RCS.png',
    width: 242,
    height: 74,
    displayClassName: 'h-5 w-auto',
  },
];

/**
 * Instalment methods, shown only once PayFast has activated them
 * (see INSTALMENTS_ENABLED in lib/instalments.ts).
 *
 * These render as wordmarks until the official logo files are added to
 * /public and wired up with src/width/height like the entries above.
 */
export const instalmentMethodLogos: PaymentBrandLogo[] = [
  { name: 'Payflex' },
  { name: 'MoreTyme' },
];
