import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock3, FileText, LockKeyhole, MessageCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import { asyncServices, getAsyncService, type AsyncService } from '@/lib/buying-flow';
import { getBookingPaymentId, getBookingPaymentSecret, verifyBookingPaymentToken } from '@/lib/booking-payment';
import { isPayFastSandboxMode } from '@/lib/payfast';
import { CV_REVIEW_REVAMP_AMOUNT_DUE, ensureCvReviewUpgradeCredit, getUpgradeOfferByToken, markUpgradeCreditUsed } from '@/lib/upgrade-credits';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import IntakeForm from './IntakeForm';

type ThanksPageProps = {
  params: Promise<{ service: string }>;
  searchParams: Promise<{ payment_id?: string; upgrade_token?: string; booking_token?: string }>;
};

const INTAKE_ACCESS_WINDOW_DAYS = 14;

function getIntakeService(service: AsyncService) {
  const { confirmationBody, ...intakeService } = service;
  void confirmationBody;
  return intakeService;
}

export function generateStaticParams() {
  return Object.keys(asyncServices).map((service) => ({ service }));
}

export async function generateMetadata({ params }: ThanksPageProps): Promise<Metadata> {
  const { service: serviceSlug } = await params;
  const service = getAsyncService(serviceSlug);
  if (!service) return {};

  return {
    title: `Intake | ${service.title} | Coach Kagiso`,
  };
}

async function validatePayment(serviceSlug: string, paymentId?: string) {
  const service = getAsyncService(serviceSlug);
  if (!service || !paymentId) return { service, valid: false };

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from('payments')
    .select('payment_id, service_slug, status, confirmed_at')
    .eq('payment_id', paymentId)
    .maybeSingle();

  const confirmedAt = data?.confirmed_at ? new Date(data.confirmed_at).getTime() : 0;
  const isRecent = confirmedAt > Date.now() - INTAKE_ACCESS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  return {
    service,
    valid:
      Boolean(data) &&
      data?.status === 'confirmed' &&
      data?.service_slug === service.slug &&
      isRecent,
  };
}

async function confirmSandboxReturn(serviceSlug: string, paymentId?: string, upgradeToken?: string, bookingToken?: string) {
  const service = getAsyncService(serviceSlug);
  const isSandbox = isPayFastSandboxMode();
  const isGeneratedPaymentId = paymentId?.startsWith(`${service?.slug}-`);
  const bookingClaims = service?.checkoutAccess === 'accepted_booking'
    ? verifyBookingPaymentToken(bookingToken || '', getBookingPaymentSecret())
    : null;
  const hasValidBookingAccess = service?.checkoutAccess !== 'accepted_booking' || Boolean(
    bookingClaims &&
    bookingClaims.serviceSlug === service.slug &&
    paymentId === getBookingPaymentId(bookingClaims.serviceSlug, bookingClaims.bookingUid)
  );

  if (!service || !paymentId || !isSandbox || !isGeneratedPaymentId || !hasValidBookingAccess) {
    return false;
  }

  const now = new Date().toISOString();
  const upgradeOffer =
    service.slug === 'cv-revamp' && upgradeToken
      ? await getUpgradeOfferByToken(upgradeToken, 'cv-revamp')
      : null;
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('payments').upsert(
    {
      payment_id: paymentId,
      service_slug: service.slug,
      amount: upgradeOffer?.valid ? CV_REVIEW_REVAMP_AMOUNT_DUE : service.amount,
      status: 'confirmed',
      confirmed_at: now,
    },
    { onConflict: 'payment_id' },
  );

  if (error) {
    return false;
  }

  if (service.slug === 'cv-review') {
    await ensureCvReviewUpgradeCredit({ paymentId, confirmedAt: now });
  }

  if (upgradeOffer?.valid) {
    await markUpgradeCreditUsed(upgradeOffer.credit.token, paymentId);
  }

  return true;
}

export default async function ThanksPage({ params, searchParams }: ThanksPageProps) {
  const { service: serviceSlug } = await params;
  const { payment_id: paymentId, upgrade_token: upgradeToken, booking_token: bookingToken } = await searchParams;
  let { service, valid } = await validatePayment(serviceSlug, paymentId);
  if (!valid && (await confirmSandboxReturn(serviceSlug, paymentId, upgradeToken, bookingToken))) {
    valid = true;
  }
  if (!service) notFound();
  const isEventService = service.kind === 'event';
  const isAppointmentService = service.kind === 'booking';
  const handoffItems = isAppointmentService
    ? [
        { icon: LockKeyhole, label: 'Payment confirmed', detail: 'Your PayFast reference is connected to the appointment Kagiso accepted.' },
        { icon: CheckCircle2, label: 'Time secured', detail: 'You do not need to book again or repeat the information you already submitted.' },
        { icon: Clock3, label: 'Appointment next', detail: `Your service: ${service.turnaround}. Keep the Cal.com confirmation for the agreed date and time.` },
      ]
    : isEventService
    ? [
        { icon: LockKeyhole, label: 'Payment confirmed', detail: 'Your checkout reference is attached to this seat.' },
        { icon: FileText, label: 'Prep form submitted here', detail: 'Share the context Kagiso needs to shape the live room.' },
        { icon: Clock3, label: 'Session access follows', detail: `Live session: ${service.turnaround}.` },
      ]
    : [
        { icon: LockKeyhole, label: 'Payment confirmed', detail: 'Your checkout reference is attached to this order.' },
        { icon: FileText, label: 'Brief submitted here', detail: 'Share the role context, links, and file Kagiso needs.' },
        { icon: Clock3, label: 'Delivery window begins', detail: `Expected turnaround: ${service.turnaround}.` },
      ];
  const beforeSubmitFaqs = isAppointmentService
    ? [
        {
          question: 'Do I need to fill in another form?',
          answer: 'No. The information from your accepted Cal.com request is already connected to the appointment.',
        },
        {
          question: 'Where are my appointment details?',
          answer: 'Use the Cal.com confirmation for the accepted date, time, and meeting information.',
        },
        {
          question: 'What if I need to change something?',
          answer: 'Reply to your confirmation email or WhatsApp Kagiso before the appointment.',
        },
      ]
    : isEventService
    ? [
        {
          question: 'Why do I need to complete this?',
          answer: 'Your prep notes help Kagiso shape the session around real patterns in the room, not generic career advice.',
        },
        {
          question: 'When do I get the session link?',
          answer: 'You will receive the Microsoft Teams link and prep details before the session.',
        },
        {
          question: 'What if I need to add something later?',
          answer: 'Reply to your confirmation email or WhatsApp Kagiso with your payment reference.',
        },
      ]
    : [
        {
          question: 'When does my turnaround start?',
          answer: 'As soon as this brief and any required file are in, your delivery window starts.',
        },
        {
          question: 'What if I remember something later?',
          answer: 'Reply to your confirmation email or WhatsApp Kagiso with the extra detail and your order reference.',
        },
        {
          question: 'How should I send my CV?',
          answer: 'Upload it here now, or choose the email option in the form and send it after you submit.',
        },
        {
          question: 'How will I receive the finished work?',
          answer: 'Kagiso will send your completed work back by email within the turnaround window.',
        },
      ];

  return (
    <main className="min-h-screen bg-[#FCFBFA] text-[#142334]">
      <Navbar />

      <section className="relative overflow-hidden bg-[#E4D8CB] pt-[124px] pb-16 lg:pb-24">
        <div className="absolute inset-x-0 top-24 pointer-events-none select-none text-center">
          <span className="font-serif text-[15vw] leading-none text-white/35 tracking-normal">
            INTAKE
          </span>
        </div>
        <div className="relative z-10 mx-auto max-w-[1120px] px-6 lg:px-8">
          <Reveal className="max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#142334]/25 bg-white/25 px-4 py-1 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#142334]/70">
              <CheckCircle2 className="h-4 w-4 text-[#142334]" />
              Payment secured
            </p>
            <h1 className="mt-7 font-serif text-[50px] leading-[0.98] md:text-[76px]">
              {isAppointmentService
                ? 'Your appointment is accepted, paid, and confirmed.'
                : isEventService
                  ? 'Your seat is secured. Let&apos;s shape the room.'
                  : 'Your order is in. Let&apos;s make the brief count.'}
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-relaxed text-[#142334]/76">
              {isAppointmentService
                ? `I've received your payment for ${service.title}. You do not need to submit your details or choose a time again.`
                : isEventService
                ? `I've received your payment for ${service.title}. The short prep form below gives Kagiso the context she needs before the live session.`
                : `I've received your payment for ${service.title}. The short intake below gives Kagiso the context she needs to deliver sharp, tailored work within ${service.turnaround}.`}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-14 lg:py-20">
        <div className="mx-auto grid max-w-[1120px] gap-10 px-6 lg:grid-cols-[0.55fr_1fr] lg:px-8">
          <Reveal direction="right">
            <div className="lg:sticky lg:top-28">
              <div className="border border-[#D8C8BB] bg-white p-6 md:p-7">
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
                  {isAppointmentService ? 'Appointment handoff' : isEventService ? 'Seat handoff' : 'Order handoff'}
                </p>
                <h2 className="mt-4 font-serif text-[38px] leading-tight">{service.turnaround}</h2>
                <p className="mt-4 text-[15px] leading-relaxed text-[#142334]/70">
                  {isAppointmentService
                    ? 'The accepted Cal.com time and your payment now form one confirmed appointment.'
                    : isEventService
                    ? 'Your seat is confirmed. These prep notes help Kagiso make the session more specific and useful.'
                    : 'Your delivery clock starts once the intake form and required file are received.'}
                </p>
                <div className="mt-6 space-y-4 border-t border-[#142334]/10 pt-5">
                  {handoffItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex gap-3">
                        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7F1EC] text-[#C9AD98]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#142334]">{item.label}</p>
                          <p className="mt-1 text-[14px] leading-relaxed text-[#142334]/62">{item.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-5 border border-[#D8C8BB] bg-white p-6 md:p-7">
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
                  {isAppointmentService ? 'What happens now' : 'Before you submit'}
                </p>
                <div className="mt-5 space-y-4">
                  {beforeSubmitFaqs.map((item) => (
                    <div key={item.question} className="border-t border-[#142334]/10 pt-4 first:border-t-0 first:pt-0">
                      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#142334]">{item.question}</p>
                      <p className="mt-2 text-[14px] leading-relaxed text-[#142334]/62">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
              <a
                href="https://wa.me/27695124398"
                className="mt-7 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#C9AD98] transition hover:text-[#142334]"
              >
                <MessageCircle className="h-4 w-4" />
                Need help? WhatsApp Kagiso
              </a>
            </div>
          </Reveal>

          <Reveal direction="left" delay={0.08}>
            {valid && paymentId && isAppointmentService ? (
              <div role="status" className="border border-[#D8C8BB] bg-white p-7 md:p-9">
                <CheckCircle2 className="h-10 w-10 text-[#C9AD98]" />
                <h2 className="mt-5 font-serif text-[36px] leading-tight text-[#142334]">
                  No more forms. You&apos;re confirmed.
                </h2>
                <p className="mt-5 text-[17px] leading-relaxed text-[#142334]/72">
                  Keep your Cal.com confirmation for the accepted date, time, and meeting details. Kagiso now has the information you submitted and the confirmed payment for this appointment.
                </p>
                <p className="mt-5 border-t border-[#142334]/10 pt-5 text-[13px] leading-relaxed text-[#142334]/58">
                  Payment reference: {paymentId}
                </p>
              </div>
            ) : valid && paymentId ? (
              <IntakeForm service={getIntakeService(service)} paymentId={paymentId} />
            ) : (
              <div className="border border-[#D8C8BB] bg-white p-7 md:p-9">
                <h2 className="font-serif text-[36px] leading-tight text-[#142334]">
                  We couldn&apos;t verify your payment.
                </h2>
                <p className="mt-5 text-[17px] leading-relaxed text-[#142334]/72">
                  If you&apos;ve just paid, give it 30 seconds and refresh. If the problem continues, WhatsApp Kagiso with your payment reference and we&apos;ll sort it out.
                </p>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
