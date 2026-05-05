import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileSearch, ShieldCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import { FlowRibbon } from '@/components/DecorativeMotifs';

export const metadata: Metadata = {
  title: 'ATS CV Checklist | Coach Kagiso',
  description:
    'A free ATS CV checklist for South African professionals who want to check formatting, file type, and keyword alignment before applying.',
  alternates: {
    canonical: '/resources/ats-cv-checklist',
  },
  openGraph: {
    title: 'ATS CV Checklist | Coach Kagiso',
    description:
      'A free ATS CV checklist to help South African professionals avoid formatting and keyword issues before they apply.',
    url: '/resources/ats-cv-checklist',
  },
};

const checks = [
  'Run the plain-text test before you apply',
  'Check section headings, file format, and layout risks',
  'Review keyword alignment against the job advert',
];

export default function AtsCvChecklistPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#FCFBFA] text-[#142334]">
      <Navbar />

      <section className="relative overflow-hidden bg-[#E4D8CB] pt-[124px] pb-20 lg:pb-28">
        <div className="absolute inset-x-0 top-24 pointer-events-none select-none text-center">
          <span className="font-serif text-[13vw] leading-none text-white/35 tracking-normal">
            CHECKLIST
          </span>
        </div>
        <FlowRibbon className="absolute -right-28 top-4 h-[680px] w-[520px] opacity-[0.18] text-[#142334] pointer-events-none" />

        <div className="relative z-10 max-w-[1180px] mx-auto px-6 lg:px-8">
          <Reveal className="max-w-4xl">
            <Link href="/resources/downloads" className="text-[12px] uppercase tracking-[0.2em] font-semibold text-[#142334]/65 hover:text-[#142334]">
              Resources / ATS CV Checklist
            </Link>
            <h1 className="mt-7 font-serif text-[52px] md:text-[86px] leading-[0.94] font-medium">
              The free ATS CV checklist for South African job applications.
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-relaxed text-[#142334]/76">
              Use it before you apply so your CV has a better chance of being read clearly by both the machine and the recruiter behind it.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-[1180px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.9fr_1fr] gap-12 lg:gap-16 items-start">
            <Reveal direction="right">
              <div className="bg-[#142334] p-8 md:p-10 text-white">
                <ShieldCheck className="h-8 w-8 text-[#C9AD98]" />
                <p className="mt-8 text-[12px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
                  Free download
                </p>
                <h2 className="mt-4 font-serif text-[44px] md:text-[60px] leading-[0.98]">
                  Check the parts of your CV that usually fail first.
                </h2>
                <div className="mt-8 space-y-4 border-y border-white/12 py-7">
                  {checks.map((check) => (
                    <div key={check} className="flex gap-3 text-[15px] leading-relaxed text-white/76">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#C9AD98]" />
                      <span>{check}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal direction="left" delay={0.08}>
              <div className="border border-[#D8C8BB] bg-[#FCFBFA] p-8 md:p-10">
                <FileSearch className="h-8 w-8 text-[#C9AD98]" />
                <h3 className="mt-6 font-serif text-[38px] md:text-[52px] leading-tight">
                  Start with the checklist.
                </h3>
                <p className="mt-4 text-[16px] leading-relaxed text-[#142334]/72">
                  The full lead capture flow still lives on the main site journey, but this page now gives the ATS checklist a proper place in the resource library too.
                </p>
                <Link
                  href="/resources/downloads"
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#142334] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                >
                  View downloads <ArrowUpRight className="h-4 w-4" />
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
