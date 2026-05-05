import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  Mail,
  Sparkles,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import { FlowRibbon, GeoArchPattern } from '@/components/DecorativeMotifs';

export const metadata: Metadata = {
  title: 'Free Career Resources & Tools South Africa',
  description:
    'Free career tools, audits, checklists, and downloads from Coach Kagiso for professionals who want clarity, visibility, and a stronger next move.',
  alternates: {
    canonical: '/resources',
  },
  openGraph: {
    title: 'Free Career Resources & Tools | Coach Kagiso',
    description:
      'Free career audits, checklists, and downloads for South African professionals building visibility and clarity.',
    url: '/resources',
  },
};

const upcomingResources = [
  'SA CV Checklist',
  'LinkedIn About Prompts',
  'Interview Story Bank',
];

export default function ResourcesPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#FCFBFA] text-[#142334]">
      <Navbar />

      <section className="relative overflow-hidden bg-[#E4D8CB] pt-[124px] pb-20 lg:pb-28">
        <div className="absolute inset-x-0 top-24 pointer-events-none select-none text-center">
          <span className="font-serif text-[15vw] leading-none text-white/35 tracking-normal">
            RESOURCES
          </span>
        </div>
        <FlowRibbon className="absolute -right-28 top-2 h-[700px] w-[520px] opacity-[0.18] text-[#142334] pointer-events-none" />

        <div className="relative z-10 max-w-[1180px] mx-auto px-6 lg:px-8">
          <Reveal className="max-w-4xl">
            <p className="inline-flex rounded-full border border-[#142334]/25 px-4 py-1 text-[12px] font-semibold uppercase tracking-[0.25em] text-[#142334]/70">
              Resources
            </p>
            <h1 className="mt-7 font-serif text-[52px] md:text-[86px] leading-[0.94] font-medium">
              Practical tools for the career move you are trying to make.
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-relaxed text-[#142334]/76">
              This is where you come when you need more than inspiration. Start with the audit, download a focused resource, or use the Resources menu to choose the support that fits where you are.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="relative bg-white py-20 lg:py-28">
        <GeoArchPattern className="absolute -left-24 top-10 h-[430px] w-[540px] opacity-[0.1] text-[#142334] pointer-events-none" />
        <div className="max-w-[1180px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_0.72fr] gap-12 lg:gap-16 items-stretch">
            <Reveal direction="right">
              <div className="relative h-full bg-[#142334] p-8 md:p-10 text-white">
                <Sparkles className="h-8 w-8 text-[#C9AD98]" />
                <p className="mt-8 text-[12px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
                  Featured resource
                </p>
                <h2 className="mt-4 max-w-2xl font-serif text-[44px] md:text-[64px] leading-[0.98]">
                  5-Minute Career Diagnostic
                </h2>
                <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/74">
                  A focused assessment for South African professionals who feel stuck, stalling, or ready to pivot and need to know what kind of support fits the season they are in.
                </p>

                <div className="mt-9 grid sm:grid-cols-3 gap-3 border-y border-white/12 py-6">
                  {['10 questions', 'Instant result', 'Matched next step'].map((item) => (
                    <span key={item} className="text-[12px] uppercase tracking-[0.14em] text-white/68">
                      {item}
                    </span>
                  ))}
                </div>

                <Link
                  href="/resources/career-diagnostic"
                  className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#C9AD98] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:bg-white"
                >
                  Take the diagnostic <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>

            <Reveal direction="left" delay={0.08}>
              <div className="h-full border border-[#D8C8BB] bg-[#F7F1EC] p-8 md:p-10">
                <p className="text-[12px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                  Coming soon
                </p>
                <h3 className="mt-4 font-serif text-[38px] leading-tight">
                  More free resources are being shaped.
                </h3>
                <p className="mt-5 text-[16px] leading-relaxed text-[#142334]/72">
                  These will become downloadable tools as the library grows. For now, they show the direction of the resource hub without pretending everything is ready.
                </p>
                <div className="mt-8 space-y-3">
                  {upcomingResources.map((resource) => (
                    <div key={resource} className="flex items-center justify-between gap-4 border-t border-[#142334]/12 pt-4">
                      <span className="font-serif text-[23px]">{resource}</span>
                      <span className="rounded-full border border-[#C9AD98]/60 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#A09086]">
                        Soon
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="career-note" className="bg-[#FCFBFA] py-20">
        <div className="max-w-[980px] mx-auto px-6 lg:px-8">
          <Reveal>
            <div className="grid md:grid-cols-[0.85fr_1fr] gap-8 md:gap-12 items-center border-y border-[#142334]/15 py-10">
              <div>
                <Mail className="h-7 w-7 text-[#C9AD98]" />
                <h2 className="mt-5 font-serif text-[38px] md:text-[48px] leading-tight">
                  Get the career note.
                </h2>
                <p className="mt-4 text-[16px] leading-relaxed text-[#142334]/72">
                  One thoughtful email a month with practical career visibility insights and early access to new resources.
                </p>
              </div>

              <form className="grid gap-3">
                <input
                  type="text"
                  required
                  name="first-name"
                  placeholder="First name"
                  maxLength={50}
                  pattern="^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$"
                  title="Please use letters only. Spaces, apostrophes, and hyphens are allowed."
                  autoComplete="given-name"
                  className="w-full border border-[#D8C8BB] bg-white px-4 py-3.5 text-[15px] outline-none focus:border-[#142334]"
                />
                <input
                  type="email"
                  required
                  name="email"
                  placeholder="Email address"
                  maxLength={120}
                  autoComplete="email"
                  className="w-full border border-[#D8C8BB] bg-white px-4 py-3.5 text-[15px] outline-none focus:border-[#142334]"
                />
                <button
                  type="submit"
                  className="inline-flex justify-center rounded-full bg-[#142334] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                >
                  Join the list
                </button>
              </form>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-[#E4D8CB] py-16">
        <div className="max-w-[1180px] mx-auto px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <p className="font-serif text-[34px] md:text-[44px] leading-tight">
                Your career matters. Let&apos;s build it.
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  ['Read insights', '/insights'],
                  ['Book a call', '/book/discovery'],
                  ['Return home', '/'],
                ].map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    className="rounded-full border border-[#142334]/25 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] transition hover:bg-[#142334] hover:text-[#E4D8CB]"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
