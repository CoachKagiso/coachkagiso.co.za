import { randomUUID } from 'node:crypto';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, CheckCircle2, MessageCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import { asyncServices, formatCurrency, getAsyncService } from '@/lib/buying-flow';
import { createPayFastCheckoutFields, getPayFastProcessUrl } from '@/lib/payfast';

type BuyPageProps = {
  params: Promise<{ service: string }>;
};

export function generateStaticParams() {
  return Object.keys(asyncServices).map((service) => ({ service }));
}

export async function generateMetadata({ params }: BuyPageProps): Promise<Metadata> {
  const { service: serviceSlug } = await params;
  const service = getAsyncService(serviceSlug);
  if (!service) return {};

  return {
    title: `${service.title} — ${formatCurrency(service.amount)}`,
    description: service.summary,
    alternates: {
      canonical: `/buy/${serviceSlug}`,
    },
    openGraph: {
      title: `${service.title} — ${formatCurrency(service.amount)} | Coach Kagiso`,
      description: service.summary,
      url: `/buy/${serviceSlug}`,
    },
  };
}

export default async function BuyPage({ params }: BuyPageProps) {
  const { service: serviceSlug } = await params;
  const service = getAsyncService(serviceSlug);
  if (!service) notFound();

  const paymentId = `${service.slug}-${randomUUID()}`;
  const fields = createPayFastCheckoutFields(service, paymentId);

  return (
    <main className="min-h-screen bg-[#FCFBFA] text-[#142334]">
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
              Secure checkout
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

      <section className="py-20 lg:py-28">
        <div className="mx-auto grid max-w-[1120px] gap-10 px-6 lg:grid-cols-[0.9fr_0.62fr] lg:px-8">
          <Reveal direction="right">
            <div className="border border-[#D8C8BB] bg-white p-7 md:p-9">
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
                What happens next
              </p>
              <div className="mt-7 space-y-5">
                {[
                  'Complete secure payment through PayFast.',
                  'Return to the intake page with your payment reference.',
                  'Send Kagiso the details she needs to deliver the work.',
                ].map((step, index) => (
                  <div key={step} className="flex gap-4 border-t border-[#142334]/10 pt-5">
                    <span className="font-serif text-[25px] text-[#C9AD98]">0{index + 1}</span>
                    <p className="text-[16px] leading-relaxed text-[#142334]/72">{step}</p>
                  </div>
                ))}
              </div>

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
            <div className="bg-[#142334] p-7 text-white md:p-8">
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
                Your investment
              </p>
              <p className="mt-5 font-serif text-[62px] leading-none text-white">
                {formatCurrency(service.amount)}
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-white/68">
                Turnaround: {service.turnaround}. Payment is processed securely by PayFast.
              </p>

              <form action={getPayFastProcessUrl()} method="post" className="mt-8">
                {Object.entries(fields).map(([key, value]) => (
                  <input key={key} type="hidden" name={key} value={value} />
                ))}
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#C9AD98] px-7 py-4 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:bg-white"
                >
                  Continue to PayFast <ArrowUpRight className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-7 space-y-3 border-t border-white/12 pt-6">
                {['Card, EFT, PayShap, and supported PayFast options', 'Secure payment reference generated for this order'].map((item) => (
                  <div key={item} className="flex gap-3 text-[13px] leading-relaxed text-white/62">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#C9AD98]" />
                    {item}
                  </div>
                ))}
              </div>

              <a
                href="https://wa.me/27695124398"
                className="mt-7 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-white/72 transition hover:text-white"
              >
                <MessageCircle className="h-4 w-4 text-[#C9AD98]" />
                Got questions? WhatsApp me first
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
