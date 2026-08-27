import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { CalendarCheck, Clock3, LockKeyhole } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import {
  buildBookingCheckoutPath,
  createBookingPaymentToken,
  getBookingPaymentId,
  getBookingPaymentSecret,
  getBookingPaymentServiceForBookingPage,
} from '@/lib/booking-payment';
import { asyncServices, formatCurrency } from '@/lib/buying-flow';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import BookingConfirmRetry from './BookingConfirmRetry';

export const dynamic = 'force-dynamic';

type BookingConfirmPageProps = {
  params: Promise<{ booking: string }>;
  searchParams: Promise<{ uid?: string; bookingUid?: string }>;
};

export const metadata: Metadata = {
  title: 'Confirming your booking',
  robots: { index: false, follow: false },
};

export default async function BookingConfirmPage({ params, searchParams }: BookingConfirmPageProps) {
  const { booking } = await params;
  const serviceSlug = getBookingPaymentServiceForBookingPage(booking);
  if (!serviceSlug) notFound();

  const { uid, bookingUid } = await searchParams;
  const resolvedBookingUid = String(uid || bookingUid || '').trim();
  const service = asyncServices[serviceSlug];
  const secret = getBookingPaymentSecret();

  // The Cal.com webhook is the only thing that can create this row, and it only runs on a
  // signature-verified payload. A booking UID on its own never mints a payment token.
  if (resolvedBookingUid && secret) {
    const { data: bookingPayment } = await createSupabaseServiceClient()
      .from('payments')
      .select('buyer_email, buyer_name')
      .eq('payment_id', getBookingPaymentId(serviceSlug, resolvedBookingUid))
      .maybeSingle();

    if (bookingPayment?.buyer_email) {
      const token = createBookingPaymentToken(
        {
          serviceSlug,
          bookingUid: resolvedBookingUid,
          email: bookingPayment.buyer_email,
          name: bookingPayment.buyer_name || '',
        },
        secret,
      );

      redirect(buildBookingCheckoutPath(serviceSlug, token));
    }
  }

  const isWaitingOnWebhook = Boolean(resolvedBookingUid && secret);

  return (
    <main className="min-h-screen bg-[#FCFBFA] text-[#142334]">
      <Navbar />

      <section className="relative overflow-hidden bg-[#E4D8CB] pt-[124px] pb-20 lg:pb-24">
        <div className="absolute inset-x-0 top-24 pointer-events-none select-none text-center">
          <span className="font-serif text-[15vw] leading-none text-white/35 tracking-normal">HOLD</span>
        </div>
        <div className="relative z-10 mx-auto max-w-[1120px] px-6 lg:px-8">
          <Reveal className="max-w-3xl">
            <p className="inline-flex rounded-full border border-[#142334]/25 px-4 py-1 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#142334]/70">
              Step 2 of 2
            </p>
            <h1 className="mt-7 font-serif text-[52px] leading-[0.94] md:text-[76px]">
              Your time is held.
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-relaxed text-[#142334]/76">
              {isWaitingOnWebhook
                ? `Give us a moment while your ${service.title} slot is attached to your private checkout. This page moves on by itself.`
                : `We could not read your booking reference from that link. Your time is still held.`}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-[760px] px-6 lg:px-8">
          <Reveal>
            <div className="border border-[#D8C8BB] bg-white p-7 md:p-9">
              {isWaitingOnWebhook ? (
                <>
                  <div className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F1EC] text-[#C9AD98]">
                      <CalendarCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[16px] font-semibold text-[#142334]">Booking received</p>
                      <p className="mt-1 text-[15px] leading-relaxed text-[#142334]/68">
                        The time you picked is yours. Nobody else can take it while you pay.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-4 border-t border-[#142334]/10 pt-6">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F1EC] text-[#C9AD98]">
                      <LockKeyhole className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[16px] font-semibold text-[#142334]">
                        Payment of {formatCurrency(service.amount)} confirms it
                      </p>
                      <p className="mt-1 text-[15px] leading-relaxed text-[#142334]/68">
                        You will land on the PayFast checkout in a second. You do not need to fill anything in
                        again.
                      </p>
                    </div>
                  </div>
                  <BookingConfirmRetry />
                </>
              ) : (
                <div className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F1EC] text-[#C9AD98]">
                    <Clock3 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[16px] font-semibold text-[#142334]">Check your inbox for the payment link</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-[#142334]/68">
                      Your {service.title} booking is confirmed on the calendar and the private checkout link is on
                      its way by email. If it has not arrived in a few minutes, WhatsApp Kagiso on 069 512 4398.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
