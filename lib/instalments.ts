/**
 * Buy-now-pay-later instalment options offered through PayFast.
 *
 * No checkout code is needed to accept these. PayFast builds its own method
 * picker from whatever is enabled on the merchant account, and
 * `createPayFastCheckoutFields` deliberately never sets `payment_method`, so
 * Payflex and MoreTyme appear on the picker the moment PayFast activates them.
 *
 * This flag only controls whether we *advertise* instalments on the site.
 * Keep it false until PayFast confirms activation, otherwise the sales pages
 * promise a payment method the picker cannot actually show.
 */
export const INSTALMENTS_ENABLED = false;

/**
 * Below this, instalments read as absurd rather than helpful ("4 x R37.50"),
 * and the extra BNPL fee is not worth paying on a low-ticket order.
 */
export const INSTALMENT_MIN_AMOUNT = 500;

/** Payflex does not accept orders above this value. */
export const INSTALMENT_MAX_AMOUNT = 15000;

export type InstalmentProvider = 'payflex' | 'moretyme';

export type InstalmentPlan = {
  provider: InstalmentProvider;
  name: string;
  /** Short form for use next to the price, e.g. "4 x R300". */
  headline: string;
  /** Full breakdown, e.g. "R300 today, then R300 every 2 weeks." */
  schedule: string;
  cadence: 'fortnightly' | 'monthly';
};

/** Formats a rand amount, dropping the cents when the split is clean. */
export function formatInstalmentAmount(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded)
    ? `R${rounded.toLocaleString('en-ZA')}`
    : `R${rounded.toFixed(2)}`;
}

export function isInstalmentEligible(amount: number) {
  return INSTALMENTS_ENABLED && amount >= INSTALMENT_MIN_AMOUNT && amount <= INSTALMENT_MAX_AMOUNT;
}

/**
 * Payflex splits the order into 4 equal parts: the first is paid at checkout
 * and the rest are debited every 2 weeks. MoreTyme takes 50% at checkout, then
 * 25% at 30 days and 25% at 60 days.
 */
export function buildInstalmentPlans(amount: number): InstalmentPlan[] {
  const payflexPart = amount / 4;
  const moreTymeDeposit = amount / 2;
  const moreTymePart = amount / 4;

  return [
    {
      provider: 'payflex',
      name: 'Payflex',
      headline: `4 x ${formatInstalmentAmount(payflexPart)}`,
      schedule: `${formatInstalmentAmount(payflexPart)} today, then 3 payments of ${formatInstalmentAmount(payflexPart)} every 2 weeks.`,
      cadence: 'fortnightly',
    },
    {
      provider: 'moretyme',
      name: 'MoreTyme',
      headline: `${formatInstalmentAmount(moreTymeDeposit)} + 2 x ${formatInstalmentAmount(moreTymePart)}`,
      schedule: `${formatInstalmentAmount(moreTymeDeposit)} today, then ${formatInstalmentAmount(moreTymePart)} in 30 days and ${formatInstalmentAmount(moreTymePart)} in 60 days.`,
      cadence: 'monthly',
    },
  ];
}

/** The plans we may actually advertise for this amount. */
export function getInstalmentPlans(amount: number): InstalmentPlan[] {
  return isInstalmentEligible(amount) ? buildInstalmentPlans(amount) : [];
}

/** One-line hook for cards and listings where the full breakdown will not fit. */
export function getInstalmentTeaser(amount: number) {
  const [payflex] = getInstalmentPlans(amount);
  return payflex ? `or ${payflex.headline} interest-free with Payflex` : null;
}
