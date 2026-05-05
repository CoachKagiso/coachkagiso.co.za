import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import { asyncServices, getAsyncService } from '@/lib/buying-flow';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import IntakeForm from './IntakeForm';

type ThanksPageProps = {
  params: Promise<{ service: string }>;
  searchParams: Promise<{ payment_id?: string }>;
};

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
  const isRecent = confirmedAt > Date.now() - 30 * 60 * 1000;

  return {
    service,
    valid:
      Boolean(data) &&
      data?.status === 'confirmed' &&
      data?.service_slug === service.slug &&
      isRecent,
  };
}

export default async function ThanksPage({ params, searchParams }: ThanksPageProps) {
  const { service: serviceSlug } = await params;
  const { payment_id: paymentId } = await searchParams;
  const { service, valid } = await validatePayment(serviceSlug, paymentId);
  if (!service) notFound();

  return (
    <main className="min-h-screen bg-[#FCFBFA] text-[#142334]">
      <Navbar />

      <section className="relative overflow-hidden bg-[#E4D8CB] pt-[124px] pb-20 lg:pb-28">
        <div className="absolute inset-x-0 top-24 pointer-events-none select-none text-center">
          <span className="font-serif text-[15vw] leading-none text-white/35 tracking-normal">
            INTAKE
          </span>
        </div>
        <div className="relative z-10 mx-auto max-w-[1120px] px-6 lg:px-8">
          <Reveal className="max-w-4xl">
            <p className="inline-flex rounded-full border border-[#142334]/25 px-4 py-1 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#142334]/70">
              {service.title}
            </p>
            <h1 className="mt-7 font-serif text-[50px] leading-[0.98] md:text-[76px]">
              Got it. Now I need 5 minutes of your time.
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-relaxed text-[#142334]/76">
              I&apos;ve received your payment for {service.title}. Fill in the form below so Kagiso has what she needs to deliver the work within {service.turnaround}.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="mx-auto grid max-w-[1120px] gap-10 px-6 lg:grid-cols-[0.55fr_1fr] lg:px-8">
          <Reveal direction="right">
            <div className="lg:sticky lg:top-28">
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
                Turnaround
              </p>
              <h2 className="mt-4 font-serif text-[42px] leading-tight">{service.turnaround}</h2>
              <p className="mt-5 text-[16px] leading-relaxed text-[#142334]/72">
                Your turnaround starts once the intake form and required file are received.
              </p>
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
            {valid && paymentId ? (
              <IntakeForm service={service} paymentId={paymentId} />
            ) : (
              <div className="border border-[#D8C8BB] bg-white p-7 md:p-9">
                <h2 className="font-serif text-[36px] leading-tight text-[#142334]">
                  We couldn&apos;t verify your payment.
                </h2>
                <p className="mt-5 text-[17px] leading-relaxed text-[#142334]/72">
                  If you&apos;ve just paid, give it 30 seconds and refresh. If the problem continues, WhatsApp Kagiso.
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
