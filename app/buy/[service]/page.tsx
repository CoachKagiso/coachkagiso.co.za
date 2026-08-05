import { randomUUID } from 'node:crypto';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, CheckCircle2, Clock3, FileText, LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react';
import { FaqJsonLd } from '@/app/JsonLd';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageFaq from '@/components/PageFaq';
import PaymentBranding from '@/components/payment/PaymentBranding';
import Reveal from '@/components/Reveal';
import { asyncServices, formatCurrency, getAsyncService, getServiceCheckoutAmount } from '@/lib/buying-flow';
import {
  getBookingPaymentId,
  getBookingPaymentSecret,
  verifyBookingPaymentToken,
} from '@/lib/booking-payment';
import { getContactEmail } from '@/lib/env';
import { getPaymentProvider, getPaymentProviderName } from '@/lib/payment-provider';
import { getUpgradeOfferByToken } from '@/lib/upgrade-credits';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

type BuyPageProps = {
  params: Promise<{ service: string }>;
  searchParams: Promise<{ upgrade_token?: string; booking_token?: string }>;
};

export function generateStaticParams() {
  return Object.keys(asyncServices).map((service) => ({ service }));
}

export async function generateMetadata({ params }: BuyPageProps): Promise<Metadata> {
  const { service: serviceSlug } = await params;
  const service = getAsyncService(serviceSlug);
  if (!service) return {};

  const checkoutAmount = getServiceCheckoutAmount(service);

  return {
    title: `${service.title} — ${formatCurrency(checkoutAmount)}`,
    description: service.summary,
    alternates: {
      canonical: `/buy/${serviceSlug}`,
    },
    openGraph: {
      title: `${service.title} — ${formatCurrency(checkoutAmount)} | Coach Kagiso`,
      description: service.summary,
      url: `/buy/${serviceSlug}`,
    },
    robots: service.checkoutAccess === 'accepted_booking' ? { index: false, follow: false } : undefined,
  };
}

export default async function BuyPage({ params, searchParams }: BuyPageProps) {
  const { service: serviceSlug } = await params;
  const { upgrade_token: upgradeToken, booking_token: bookingToken = '' } = await searchParams;
  const service = getAsyncService(serviceSlug);
  if (!service) notFound();

  const upgradeOffer =
    service.slug === 'cv-revamp' && upgradeToken
      ? await getUpgradeOfferByToken(upgradeToken, 'cv-revamp')
      : null;
  const appliedUpgradeCredit = upgradeOffer?.valid ? upgradeOffer.credit : null;
  const hasAppliedUpgrade = Boolean(appliedUpgradeCredit);
  const serviceCheckoutAmount = getServiceCheckoutAmount(service);
  const checkoutAmount = appliedUpgradeCredit?.discounted_amount ?? serviceCheckoutAmount;
  const bookingClaims = service.checkoutAccess === 'accepted_booking'
    ? verifyBookingPaymentToken(bookingToken, getBookingPaymentSecret())
    : null;
  const hasValidBookingAccess = service.checkoutAccess !== 'accepted_booking' || bookingClaims?.serviceSlug === service.slug;
  const paymentId = bookingClaims
    ? getBookingPaymentId(bookingClaims.serviceSlug, bookingClaims.bookingUid)
    : `${service.slug}-${randomUUID()}`;
  const isEventService = service.kind === 'event';
  const isAppointmentService = service.kind === 'booking';
  const { data: existingPayment } = bookingClaims
    ? await createSupabaseServiceClient()
        .from('payments')
        .select('status')
        .eq('payment_id', paymentId)
        .maybeSingle()
    : { data: null };
  const isAlreadyPaid = existingPayment?.status === 'confirmed';
  const paymentProvider = getPaymentProvider();
  const providerName = getPaymentProviderName(paymentProvider);
  const isManualPaymentMode = paymentProvider === 'manual';
  const isPayFastPaymentMode = paymentProvider === 'payfast';
  const contactEmail = getContactEmail();
  const manualMessage = `Hi Kagiso, I want to book ${service.title} for ${formatCurrency(checkoutAmount)}. Please send me the next step while online checkout is being activated.`;
  const manualEmailHref = `mailto:${contactEmail}?subject=${encodeURIComponent(`Purchase request: ${service.title}`)}&body=${encodeURIComponent(`${manualMessage}\n\nService: ${service.title}\nAmount: ${formatCurrency(checkoutAmount)}`)}`;
  const manualWhatsAppHref = `https://wa.me/27695124398?text=${encodeURIComponent(manualMessage)}`;
  const fields = isPayFastPaymentMode || null;

  return (
    <main className="min-h-screen bg-[#FCFBFA] text-[#142334]">
      <FaqJsonLd items={service.faqs.map((item) => ({ question: item.question, answer: item.answer }))} />
      <Navbar />

      <section className="relative overflow-hidden bg-[#E4D8CB] pt-[124px] pb-20 lg:pb-28">
        <div className="absolute inset-x-0 top-24 pointer-events-none select-none text-center">
          <span className="font-serif text-[15vw] leading-none text-white/35 tracking-normal">
            BUY
          </span>
        </div>
        <div className="relative z-10 mx-auto max-w-[1120px] px-6 lg:px-8">
          <Reveal className="max-w-4xl">
            <p className="inline-flex rounded-full border border-[#142334]/25 px-4 py-1 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#142334]/70">
              {isManualPaymentMode ? 'Direct purchase request' : 'Secure checkout'}
            </p>
            <h1 className="mt-7 font-serif text-[52px] leading-[0.94] md:text-[82px]">
              {service.title}
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-relaxed text-[#142334]/76">
              {service.summary}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="mx-auto grid max-w-[1120px] gap-10 px-6 lg:grid-cols-[0.9fr_0.62fr] lg:px-8">
          <Reveal direction="right">
            <div className="border border-[#D8C8BB] bg-white p-7 md:p-9">
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
                Purchase flow
              </p>
              <h2 className="mt-4 font-serif text-[40px] leading-tight text-[#142334]">
                {isManualPaymentMode
                  ? 'A direct handoff while checkout is being activated.'
                  : isAppointmentService
                    ? 'Your time is accepted. Payment confirms it.'
                  : isEventService
                    ? 'Secure your seat, then share your prep notes.'
                    : 'A clear handoff after checkout.'}
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-[#142334]/68">
                {isManualPaymentMode
                  ? 'Online payment is being activated. Send Kagiso a purchase request and she will reply with the next step directly.'
                  : isAppointmentService
                    ? `Your requested time has been accepted. Pay securely through ${providerName} to confirm it; you will not need to submit your details again.`
                  : isEventService
                    ? `You will pay securely through ${providerName}, then return to a short prep form connected to your seat.`
                    : `You will pay securely through ${providerName}, then return to a private intake page connected to this order.`}
              </p>
              {service.slug === 'cv-revamp' && upgradeOffer && (
                <div className={`mt-6 border p-4 ${upgradeOffer.valid ? 'border-[#C9AD98]/50 bg-[#F7F1EC]' : 'border-[#D8C8BB] bg-[#FCFBFA]'}`}>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#C9AD98]">
                    {upgradeOffer.valid ? 'Upgrade credit applied' : 'Upgrade link unavailable'}
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#142334]/72">
                    {upgradeOffer.valid
                      ? `Your R150 CV Review credit is active for 7 days, so the amount due today is ${formatCurrency(appliedUpgradeCredit?.discounted_amount ?? service.amount)}.`
                      : upgradeOffer.reason === 'used'
                        ? 'That upgrade link has already been used. If you need help, email or WhatsApp Kagiso and she can guide you.'
                        : 'That upgrade link has expired or is no longer valid. If you need help, email or WhatsApp Kagiso and she can guide you.'}
                  </p>
                </div>
              )}
              <div className="mt-7 space-y-5">
                {[
                  isManualPaymentMode
                    ? { icon: MessageCircle, title: 'Send a purchase request', detail: 'Message Kagiso directly with the service you want and she will reply with the next step.' }
                    : { icon: LockKeyhole, title: 'Secure payment', detail: `Complete checkout through ${providerName} using the supported card, EFT, bank, or wallet options enabled for Coach Kagiso.` },
                  isManualPaymentMode
                    ? { icon: FileText, title: 'Brief follows manually', detail: 'Once the payment route is confirmed, Kagiso will send the correct intake instructions for this service.' }
                    : isAppointmentService
                      ? { icon: FileText, title: 'No repeated form', detail: 'The details from your accepted Cal.com request stay connected to this appointment.' }
                    : isEventService
                      ? { icon: FileText, title: 'Prep form', detail: 'Return automatically to the short prep form with your payment reference already attached.' }
                      : { icon: FileText, title: 'Private intake', detail: 'Return automatically to the brief form with your payment reference already attached.' },
                  isAppointmentService
                    ? { icon: Clock3, title: 'Appointment confirmed', detail: 'Payment secures the time Kagiso already accepted for you.' }
                    : isEventService
                    ? { icon: Clock3, title: 'Session access', detail: `The live session is ${service.turnaround}.` }
                    : { icon: Clock3, title: 'Delivery starts', detail: `Your ${service.turnaround} turnaround begins once the brief and required file are submitted.` },
                ].map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="flex gap-4 border-t border-[#142334]/10 pt-5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F1EC] text-[#C9AD98]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#142334]/45">Step 0{index + 1}</p>
                        <p className="mt-1 text-[16px] font-semibold text-[#142334]">{step.title}</p>
                        <p className="mt-1 text-[15px] leading-relaxed text-[#142334]/68">{step.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {service.slug === 'cv-review' && (
                <div className="mt-8 border border-[#C9AD98]/50 bg-[#F7F1EC] p-5">
                  <p className="text-[15px] leading-relaxed text-[#142334]/72">
                    If the review confirms you want Kagiso to do the rewrite, your R150 review fee carries over to the CV Revamp. You would only pay the R250 difference.
                  </p>
                  <Link href="/buy/cv-revamp" className="mt-3 inline-flex text-[12px] font-semibold uppercase tracking-[0.16em] text-[#C9AD98] hover:text-[#142334]">
                    View the CV Revamp <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              )}

              {(service.slug === 'cv-revamp' || service.slug === 'linkedin') && (
                <div className="mt-8 border border-[#C9AD98]/50 bg-[#F7F1EC] p-5">
                  <p className="text-[15px] leading-relaxed text-[#142334]/72">
                    Need both? The CV + LinkedIn Bundle is R500 and saves you R200.
                  </p>
                  <Link href="/buy/bundle" className="mt-3 inline-flex text-[12px] font-semibold uppercase tracking-[0.16em] text-[#C9AD98] hover:text-[#142334]">
                    View the bundle <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </Reveal>

          <Reveal direction="left" delay={0.08}>
            <div className="bg-[#142334] p-7 text-white shadow-[0_24px_70px_rgba(20,35,52,0.18)] md:p-8">
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
                Your investment
              </p>
              {hasAppliedUpgrade ? (
                <div className="mt-5">
                  <p className="text-[15px] uppercase tracking-[0.12em] text-white/48 line-through">
                    {formatCurrency(service.amount)}
                  </p>
                  <p className="mt-2 font-serif text-[62px] leading-none text-white">
                    {formatCurrency(checkoutAmount)}
                  </p>
                  <p className="mt-3 text-[14px] leading-relaxed text-white/68">
                    Includes your R150 CV Review credit. This upgrade link expires in 7 days.
                  </p>
                </div>
              ) : (
                <p className="mt-5 font-serif text-[62px] leading-none text-white">
                  {formatCurrency(service.amount)}
                </p>
              )}
              <p className="mt-4 text-[15px] leading-relaxed text-white/68">
                {isAppointmentService ? 'Service' : isEventService ? 'Session' : 'Turnaround'}: {service.turnaround}. {isManualPaymentMode ? 'Kagiso will confirm the payment step directly while online checkout is being activated.' : `Payment is processed securely by ${providerName}.`}
              </p>
              <div className="mt-6 border border-white/12 bg-white/[0.04] p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#C9AD98]" />
                  <p className="text-[13px] leading-relaxed text-white/68">
                    {isManualPaymentMode
                      ? 'Online checkout is temporarily paused for merchant verification. Your message keeps your place in the queue without sending you through a broken payment screen.'
                      : isAppointmentService
                        ? 'This private checkout is tied to your accepted booking. Your appointment is confirmed once PayFast confirms payment.'
                      : isEventService
                        ? 'After payment, your reference unlocks the prep form. Your spot is secured once PayFast confirms the payment.'
                        : 'After payment, your order reference unlocks the intake page. You will also receive a confirmation email after submitting your brief.'}
                  </p>
                </div>
              </div>

              {!hasValidBookingAccess ? (
                <div role="alert" className="mt-8 border border-white/18 bg-white/[0.06] p-5">
                  <p className="text-[14px] font-semibold text-white">This private payment link is unavailable.</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/68">
                    It may have expired or been copied incorrectly. Reply to your acceptance email or WhatsApp Kagiso for a fresh link.
                  </p>
                </div>
              ) : isAlreadyPaid ? (
                <div role="status" className="mt-8 border border-[#C9AD98]/45 bg-white/[0.06] p-5">
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
                    <CheckCircle2 className="h-5 w-5 text-[#C9AD98]" /> Payment already confirmed
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/68">
                    This accepted appointment has already been paid. No second payment is needed.
                  </p>
                </div>
              ) : isManualPaymentMode ? (
                <div className="mt-8 grid gap-3">
                  <a
                    href={manualWhatsAppHref}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#C9AD98] px-7 py-4 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:bg-white"
                  >
                    Message Kagiso on WhatsApp <MessageCircle className="h-4 w-4" />
                  </a>
                  <a
                    href={manualEmailHref}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-7 py-4 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:border-white hover:bg-white hover:text-[#142334]"
                  >
                    Email purchase request <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              ) : fields ? (
                <form action="/api/payfast/checkout" method="post" className="mt-8">
                  <input type="hidden" name="service_slug" value={service.slug} />
                  <input type="hidden" name="payment_id" value={paymentId} />
                  {bookingToken && (
                    <input type="hidden" name="booking_token" value={bookingToken} />
                  )}
                  {appliedUpgradeCredit && (
                    <input type="hidden" name="upgrade_token" value={appliedUpgradeCredit.token} />
                  )}
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#C9AD98] px-7 py-4 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:bg-white"
                  >
                    Continue to PayFast <ArrowUpRight className="h-4 w-4" />
                  </button>
                  <PaymentBranding />
                </form>
              ) : (
                <div className="mt-8 border border-white/12 bg-white/[0.04] p-4 text-[13px] leading-relaxed text-white/68">
                  Checkout is not configured yet. WhatsApp Kagiso and she will send the safest next step.
                </div>
              )}

              <div className="mt-7 space-y-3 border-t border-white/12 pt-6">
                {(isManualPaymentMode
                  ? ['No failed checkout page while payment verification is pending', 'Kagiso will reply directly with the safest next step']
                    : isAppointmentService
                      ? ['Private link tied to your accepted booking', 'No need to submit your details again']
                    : isEventService
                      ? ['Card, EFT, PayShap, and supported PayFast options', 'Secure seat reference generated for this masterclass']
                      : ['Card, EFT, PayShap, and supported PayFast options', 'Secure payment reference generated for this order']
                ).map((item) => (
                  <div key={item} className="flex gap-3 text-[13px] leading-relaxed text-white/62">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#C9AD98]" />
                    {item}
                  </div>
                ))}
              </div>

              {!isManualPaymentMode && (
                <a
                  href="https://wa.me/27695124398"
                  className="mt-7 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-white/72 transition hover:text-white"
                >
                  <MessageCircle className="h-4 w-4 text-[#C9AD98]" />
                  Got questions? WhatsApp me first
                </a>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <PageFaq
        eyebrow="Before you buy"
        title="Questions people usually ask before paying."
        description="These are the practical concerns that tend to come up right before someone commits. If yours is different, ask before you pay."
        items={service.faqs}
        ctaHref="/contact"
        ctaLabel="Ask before you pay"
        backgroundClassName="bg-white"
      />

      <Footer />
    </main>
  );
}
