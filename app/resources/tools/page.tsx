import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  Lightbulb,
  Mail,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import { ContourField, FlowRibbon } from '@/components/DecorativeMotifs';

export const metadata: Metadata = {
  title: 'Career Tools & Audits South Africa',
  description:
    'Interactive career tools from Coach Kagiso to assess your visibility, positioning, and next career move. Free personal brand audit available.',
  alternates: {
    canonical: '/resources/tools',
  },
  openGraph: {
    title: 'Career Tools & Audits | Coach Kagiso',
    description:
      'Free career visibility tools and personal brand audit for South African professionals.',
    url: '/resources/tools',
  },
};

const auditChecks = [
  'Career clarity',
  'Visibility gaps',
  'Positioning confidence',
  'Next-step readiness',
];

const futureTools = [
  {
    title: 'Visibility Scorecard',
    description: 'A quick check for how clearly your work, value, and goals are showing up.',
    icon: Gauge,
  },
  {
    title: 'Promotion Readiness Check',
    description: 'A guided reflection for professionals preparing to be considered for more.',
    icon: CheckCircle2,
  },
  {
    title: 'Career Move Clarity Map',
    description: 'A decision tool for sorting whether to stay, shift, apply, or reposition.',
    icon: Lightbulb,
  },
];

export default function CareerToolsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#FCFBFA] text-[#142334]">
      <Navbar />

      <section className="relative overflow-hidden bg-[#E4D8CB] pt-[124px] pb-20 lg:pb-28">
        <div className="absolute inset-x-0 top-24 pointer-events-none select-none text-center">
          <span className="font-serif text-[16vw] leading-none text-white/35 tracking-normal">
            TOOLS
          </span>
        </div>
        <ContourField className="absolute -right-32 top-0 h-[720px] w-[600px] opacity-[0.16] text-[#142334] pointer-events-none" />

        <div className="relative z-10 max-w-[1180px] mx-auto px-6 lg:px-8">
          <Reveal className="max-w-4xl">
            <Link href="/resources" className="text-[12px] uppercase tracking-[0.2em] font-semibold text-[#142334]/65 hover:text-[#142334]">
              Resources / Tools
            </Link>
            <h1 className="mt-7 font-serif text-[52px] md:text-[86px] leading-[0.94] font-medium">
              Start with the tool that shows you what to focus on next.
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-relaxed text-[#142334]/76">
              These tools are designed to help you assess your current career season, understand what may be holding you back, and receive a practical next step.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="relative bg-[#FCFBFA] py-20 lg:py-28">
        <FlowRibbon className="absolute -left-28 bottom-0 h-[620px] w-[480px] opacity-[0.12] text-[#142334] pointer-events-none" />
        <div className="relative z-10 max-w-[1180px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.92fr_1fr] gap-12 lg:gap-16 items-center">
            <Reveal direction="right">
              <div className="bg-[#142334] p-8 md:p-10 text-white shadow-[0_28px_90px_rgba(20,35,52,0.2)]">
                <ClipboardCheck className="h-9 w-9 text-[#C9AD98]" />
                <p className="mt-8 text-[12px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
                  Featured tool
                </p>
                <h2 className="mt-4 font-serif text-[44px] md:text-[64px] leading-[0.98]">
                  5-Minute Career Diagnostic
                </h2>
                <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/74">
                  Answer 10 focused questions and receive a career archetype, a 7-day action, and a recommended next step based on the season you are in.
                </p>

                <div className="mt-8 grid sm:grid-cols-2 gap-3">
                  {auditChecks.map((check) => (
                    <div key={check} className="flex items-center gap-3 border border-white/12 px-4 py-3">
                      <CheckCircle2 className="h-4 w-4 text-[#C9AD98]" />
                      <span className="text-[13px] uppercase tracking-[0.12em] text-white/72">{check}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/resources/career-diagnostic"
                  className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#C9AD98] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:bg-white"
                >
                  Start the diagnostic <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>

            <Reveal direction="left" delay={0.08}>
              <div>
                <p className="text-[12px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                  How it works
                </p>
                <h3 className="mt-4 font-serif text-[42px] md:text-[58px] leading-tight">
                  A personal result, not a generic checklist.
                </h3>
                <div className="mt-8 space-y-6 border-y border-[#142334]/15 py-8">
                  {[
                    'Complete the questions in a few minutes.',
                    'Receive your result and recommended next focus.',
                    'Leave with a clear summary you can act on straight away.',
                    'Book a session if you want help applying the result.',
                  ].map((step, index) => (
                    <div key={step} className="grid grid-cols-[auto_1fr] gap-5">
                      <span className="font-display text-[28px] text-[#C9AD98]">0{index + 1}</span>
                      <p className="text-[17px] leading-relaxed text-[#142334]/76">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-[1180px] mx-auto px-6 lg:px-8">
          <Reveal className="max-w-2xl mb-12">
            <p className="text-[12px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
              In development
            </p>
            <h2 className="mt-4 font-serif text-[42px] md:text-[56px] leading-tight">
              Tools that meet different career moments.
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 border-y border-[#142334]/15">
            {futureTools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <Reveal key={tool.title} delay={index * 0.08} className="py-9 md:p-8 md:border-r md:last:border-r-0 border-[#142334]/15">
                  <Icon className="h-7 w-7 text-[#C9AD98]" />
                  <h3 className="mt-6 font-serif text-[30px] leading-tight">{tool.title}</h3>
                  <p className="mt-4 text-[16px] leading-relaxed text-[#142334]/72">{tool.description}</p>
                  <span className="mt-6 inline-flex rounded-full border border-[#C9AD98]/60 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#A09086]">
                    In development
                  </span>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#E4D8CB] py-16">
        <Reveal className="max-w-[980px] mx-auto px-6 lg:px-8 text-center">
          <Mail className="mx-auto h-7 w-7 text-[#142334]/60" />
          <h2 className="mt-5 font-serif text-[38px] md:text-[52px] leading-tight">
            Want the next tool when it is ready?
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#142334]/72">
            Join the career note and you will hear when new tools and downloads are released.
          </p>
          <Link
            href="/resources#career-note"
            className="mt-8 inline-flex rounded-full bg-[#142334] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-white hover:text-[#142334]"
          >
            Join the list
          </Link>
        </Reveal>
      </section>

      <Footer />
    </main>
  );
}
