import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Compass, Sparkles } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import { GeoArchPattern } from '@/components/DecorativeMotifs';

export const metadata: Metadata = {
  title: 'Personal Brand Audit | Coach Kagiso',
  description:
    'A free personal brand audit for South African professionals who want to understand whether their visibility matches where they want their career to go.',
  alternates: {
    canonical: '/resources/personal-brand-audit',
  },
  openGraph: {
    title: 'Personal Brand Audit | Coach Kagiso',
    description:
      'A free personal brand audit for professionals who want more clarity, visibility, and alignment.',
    url: '/resources/personal-brand-audit',
  },
};

const signals = [
  'Check whether your CV, LinkedIn, and work story align',
  'Spot the gap between your current visibility and your next move',
  'Leave with a clearer view of what to fix first',
];

export default function PersonalBrandAuditPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#FCFBFA] text-[#142334]">
      <Navbar />

      <section className="relative overflow-hidden bg-[#E4D8CB] pt-[124px] pb-20 lg:pb-28">
        <div className="absolute inset-x-0 top-24 pointer-events-none select-none text-center">
          <span className="font-serif text-[14vw] leading-none text-white/35 tracking-normal">
            AUDIT
          </span>
        </div>
        <GeoArchPattern className="absolute -right-24 top-10 h-[460px] w-[560px] opacity-[0.14] text-[#142334] pointer-events-none" />

        <div className="relative z-10 max-w-[1180px] mx-auto px-6 lg:px-8">
          <Reveal className="max-w-4xl">
            <Link href="/resources" className="text-[12px] uppercase tracking-[0.2em] font-semibold text-[#142334]/65 hover:text-[#142334]">
              Resources / Personal Brand Audit
            </Link>
            <h1 className="mt-7 font-serif text-[52px] md:text-[86px] leading-[0.94] font-medium">
              The free audit for professionals who know they need a clearer next move.
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-relaxed text-[#142334]/76">
              Use this when your career feels foggy, your visibility feels uneven, or you are doing good work without a clear story around it.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-[1180px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.92fr_1fr] gap-12 lg:gap-16 items-start">
            <Reveal direction="right">
              <div className="bg-[#142334] p-8 md:p-10 text-white">
                <Sparkles className="h-8 w-8 text-[#C9AD98]" />
                <p className="mt-8 text-[12px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
                  Free resource
                </p>
                <h2 className="mt-4 font-serif text-[44px] md:text-[60px] leading-[0.98]">
                  Understand what your career visibility is really saying.
                </h2>
                <div className="mt-8 space-y-4 border-y border-white/12 py-7">
                  {signals.map((signal) => (
                    <div key={signal} className="flex gap-3 text-[15px] leading-relaxed text-white/76">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#C9AD98]" />
                      <span>{signal}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal direction="left" delay={0.08}>
              <div className="border border-[#D8C8BB] bg-[#FCFBFA] p-8 md:p-10">
                <Compass className="h-8 w-8 text-[#C9AD98]" />
                <h3 className="mt-6 font-serif text-[38px] md:text-[52px] leading-tight">
                  Start with the audit.
                </h3>
                <p className="mt-4 text-[16px] leading-relaxed text-[#142334]/72">
                  The full audit experience currently lives on the homepage so it stays close to the main lead capture flow. This page gives it a proper home in the resources library too.
                </p>
                <Link
                  href="/#leadmagnet"
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#142334] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                >
                  Open the audit <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
