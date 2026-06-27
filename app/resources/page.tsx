import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  ClipboardCheck,
  Compass,
  Download,
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

const resourcePaths = [
  {
    eyebrow: 'Start here',
    title: '5-Minute Career Diagnostic',
    description:
      'Use this first when you want clarity on what kind of support fits your season before you spend time guessing.',
    href: '/resources/career-diagnostic',
    cta: 'Take the diagnostic',
    icon: Sparkles,
    highlights: ['10 questions', 'Instant result', 'Matched next step'],
    theme: 'dark' as const,
  },
  {
    eyebrow: 'Use a tool',
    title: 'Career tools',
    description:
      'Interactive assessments for visibility, positioning, and career decision-making when you need more than generic advice.',
    href: '/resources/tools',
    cta: 'Browse tools',
    icon: ClipboardCheck,
    highlights: ['Diagnostics', 'Visibility checks', 'Practical next steps'],
    theme: 'light' as const,
  },
  {
    eyebrow: 'Download something',
    title: 'Free downloads',
    description:
      'Checklists, prompt guides, and manager kits for the moments when you need structure, language, or something tangible to work through.',
    href: '/resources/downloads',
    cta: 'Browse downloads',
    icon: Download,
    highlights: ['Checklists', 'Prompt guides', 'Manager kits'],
    theme: 'light' as const,
  },
];

const availableNow = [
  {
    label: 'Diagnostic',
    title: '5-Minute Career Diagnostic',
    note: 'A fast assessment for clarity, visibility, and next-step direction.',
    href: '/resources/career-diagnostic',
  },
  {
    label: 'Download',
    title: 'First 90 Days Checklist',
    note: 'A promotion operating kit for new managers and first-time leaders.',
    href: '/resources/downloads#first-90-days-checklist',
  },
  {
    label: 'Download',
    title: 'SA LinkedIn Headline Builder',
    note: 'A headline rewrite guide with formulas, examples, and keyword cues.',
    href: '/resources/downloads#linkedin-headline-builder',
  },
  {
    label: 'Download',
    title: 'The South African CV Checklist',
    note: 'A fifteen-check self-audit that scores whether your CV gets seen.',
    href: '/resources/downloads#sa-cv-checklist',
  },
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
              Choose the format that helps you move.
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-relaxed text-[#142334]/76">
              This hub is for practical support, not article reading. Start with a diagnostic, open a tool, or download something useful depending on what kind of help you need right now.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {['Start with clarity', 'Use a practical tool', 'Download and apply'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#142334]/15 bg-white/35 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#142334]/72"
                >
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative bg-white py-20 lg:py-28">
        <GeoArchPattern className="absolute -left-24 top-10 h-[430px] w-[540px] opacity-[0.1] text-[#142334] pointer-events-none" />
        <div className="max-w-[1180px] mx-auto px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <p className="text-[12px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
              Choose your route
            </p>
            <h2 className="mt-4 font-serif text-[42px] md:text-[58px] leading-[0.98]">
              One hub. Three useful ways in.
            </h2>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-[#142334]/72">
              The menu is the shortcut when you already know what you want. This page is the calmer version when you need help choosing the right resource first.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
            {resourcePaths.map((path, index) => {
              const Icon = path.icon;
              const isDark = path.theme === 'dark';

              return (
                <Reveal
                  key={path.title}
                  direction={index === 0 ? 'right' : 'left'}
                  delay={index === 0 ? 0 : 0.06 * index}
                  className={index === 0 ? 'lg:row-span-2' : ''}
                >
                  <article
                    className={`h-full ${isDark ? 'bg-[#142334] text-white' : 'border border-[#D8C8BB] bg-[#F7F1EC] text-[#142334]'} p-8 md:p-10`}
                  >
                    <Icon className={`h-8 w-8 ${isDark ? 'text-[#C9AD98]' : 'text-[#A98974]'}`} />
                    <p className={`mt-8 text-[12px] uppercase tracking-[0.24em] font-semibold ${isDark ? 'text-[#C9AD98]' : 'text-[#A98974]'}`}>
                      {path.eyebrow}
                    </p>
                    <h3 className="mt-4 max-w-2xl font-serif text-[40px] md:text-[58px] leading-[0.98]">
                      {path.title}
                    </h3>
                    <p className={`mt-5 max-w-xl text-[17px] leading-relaxed ${isDark ? 'text-white/72' : 'text-[#142334]/72'}`}>
                      {path.description}
                    </p>

                    <div className={`mt-8 grid gap-3 sm:grid-cols-3 ${isDark ? 'border-y border-white/12' : 'border-y border-[#142334]/12'} py-6`}>
                      {path.highlights.map((item) => (
                        <span
                          key={item}
                          className={`text-[11px] uppercase tracking-[0.16em] ${isDark ? 'text-white/68' : 'text-[#142334]/62'}`}
                        >
                          {item}
                        </span>
                      ))}
                    </div>

                    <Link
                      href={path.href}
                      className={`mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] transition ${
                        isDark
                          ? 'bg-[#C9AD98] text-[#142334] hover:bg-white'
                          : 'border border-[#142334]/18 bg-white text-[#142334] hover:bg-[#142334] hover:text-[#F7F1EC]'
                      }`}
                    >
                      {path.cta} <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#FCFBFA] py-20 lg:py-24">
        <div className="max-w-[1180px] mx-auto px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1fr] lg:items-start">
            <Reveal direction="right">
              <div>
                <Compass className="h-8 w-8 text-[#C9AD98]" />
                <p className="mt-7 text-[12px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                  Available now
                </p>
                <h2 className="mt-4 font-serif text-[42px] md:text-[56px] leading-[0.98]">
                  Open the resources that are ready today.
                </h2>
                <p className="mt-5 max-w-md text-[16px] leading-relaxed text-[#142334]/72">
                  No filler shelf, no article detour. Just the live tools and downloads someone can use immediately.
                </p>
              </div>
            </Reveal>

            <div className="border-y border-[#142334]/12">
              {availableNow.map((item, index) => (
                <Reveal key={item.title} delay={index * 0.06}>
                  <Link
                    href={item.href}
                    className="group grid gap-4 border-b border-[#142334]/12 py-6 last:border-b-0 md:grid-cols-[120px_1fr_auto] md:items-center"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A98974]">
                      {item.label}
                    </span>
                    <div>
                      <h3 className="font-serif text-[28px] leading-tight transition group-hover:text-[#A98974]">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-[#142334]/68">
                        {item.note}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#142334]">
                      Open <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
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
                Want support beyond the free layer?
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  ['Work with me', '/work-with-me'],
                  ['Browse tools', '/resources/tools'],
                  ['Browse downloads', '/resources/downloads'],
                  ['Book a call', '/book/discovery'],
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
