import { randomUUID } from 'node:crypto';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, CheckCircle2, Clock3, FileText, LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react';
import { FaqJsonLd } from '@/app/JsonLd';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageFaq from '@/components/PageFaq';
import Reveal from '@/components/Reveal';
import { asyncServices, formatCurrency, getAsyncService } from '@/lib/buying-flow';
import { createPayFastCheckoutFields, getPayFastProcessUrl } from '@/lib/payfast';
import { getUpgradeOfferByToken } from '@/lib/upgrade-credits';

type BuyPageProps = {
  params: Promise<{ service: string }>;
  searchParams: Promise<{ upgrade_token?: string }>;
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

export default async function BuyPage({ params, searchParams }: BuyPageProps) {
  const { service: serviceSlug } = await params;
  const { upgrade_token: upgradeToken } = await searchParams;
  const service = getAsyncService(serviceSlug);
  if (!service) notFound();

  const upgradeOffer =
    service.slug === 'cv-revamp' && upgradeToken
      ? await getUpgradeOfferByToken(upgradeToken, 'cv-revamp')
      : null;
  const appliedUpgradeCredit = upgradeOffer?.valid ? upgradeOffer.credit : null;
  const hasAppliedUpgrade = Boolean(appliedUpgradeCredit);
  const checkoutAmount = appliedUpgradeCredit?.discounted_amount ?? service.amount;
  const paymentId = `${service.slug}-${randomUUID()}`;
  const fields = createPayFastCheckoutFields(service, paymentId, {
    amountOverride: checkoutAmount,
    customFields: appliedUpgradeCredit ? { custom_str2: appliedUpgradeCredit.token } : undefined,
    extraReturnParams: appliedUpgradeCredit ? { upgrade_token: appliedUpgradeCredit.token } : undefined,
  });

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

      <section className="py-16 lg:py-24">
        <div className="mx-auto grid max-w-[1120px] gap-10 px-6 lg:grid-cols-[0.9fr_0.62fr] lg:px-8">
          <Reveal direction="right">
            <div className="border border-[#D8C8BB] bg-white p-7 md:p-9">
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
                Purchase flow
              </p>
              <h2 className="mt-4 font-serif text-[40px] leading-tight text-[#142334]">
                A clear handoff after checkout.
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-[#142334]/68">
                You will pay securely through PayFast, then return to a private intake page connected to this order.
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
                  { icon: LockKeyhole, title: 'Secure payment', detail: 'Complete checkout through PayFast using card, EFT, PayShap, or supported options.' },
                  { icon: FileText, title: 'Private intake', detail: 'Return automatically to the brief form with your payment reference already attached.' },
                  { icon: Clock3, title: 'Delivery starts', detail: `Your ${service.turnaround} turnaround begins once the brief and required file are submitted.` },
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
                Turnaround: {service.turnaround}. Payment is processed securely by PayFast.
              </p>
              <div className="mt-6 border border-white/12 bg-white/[0.04] p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#C9AD98]" />
                  <p className="text-[13px] leading-relaxed text-white/68">
                    After payment, your order reference unlocks the intake page. You will also receive a confirmation email after submitting your brief.
                  </p>
                </div>
              </div>

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
