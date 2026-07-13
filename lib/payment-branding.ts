export type PaymentBrandLogo = {
  name: string;
  src: string;
  width: number;
  height: number;
  displayClassName: string;
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
    name: 'Mobicred',
    src: '/mobicred_logoMark_grp.png',
    width: 441,
    height: 86,
    displayClassName: 'h-5 w-auto',
  },
];
