import type { Metadata } from 'next';
import type { ComponentType } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Layers3,
  UsersRound,
} from 'lucide-react';
import { FaqJsonLd } from '@/app/JsonLd';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageFaq from '@/components/PageFaq';
import Reveal from '@/components/Reveal';
import ParallaxWord from '@/components/ParallaxWord';
import WorkTrackNav from '@/components/WorkTrackNav';
import LinkedInHeadlineBuilderForm from '@/components/LinkedInHeadlineBuilderForm';
import { ContourField, FlowRibbon, GeoArchPattern } from '@/components/DecorativeMotifs';
import { getMasterclassPriceLabel, getMasterclassPriceNote } from '@/lib/buying-flow';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

type Service = {
  title: string;
  price: string;
  sessionLine?: string;
  tagline: string;
  body: string | string[];
  items: string[];
  cta: string;
  featured?: boolean;
  badge?: string;
  note?: string;
};

function getServiceRoute(title: string) {
  const routes: Record<string, string> = {
    '48-Hour CV Review': '/buy/cv-review',
    'CV Revamp': '/buy/cv-revamp',
    'Cover Letter': '/buy/cover-letter',
    'LinkedIn Optimisation': '/buy/linkedin',
    'CV + LinkedIn Bundle': '/buy/bundle',
    'Career Clarity Session': '/book/clarity',
    'Glow Up VIP Package': '/book/glow-up',
    'Saturday Masterclass': '/buy/masterclass',
  };

  return routes[title] || '/contact';
}

type Track = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  services: Service[];
};

export const metadata: Metadata = {
  title: 'Career Coaching & CV Services South Africa | Work With Me',
  description:
    'Career coaching, CV reviews from R150, LinkedIn optimisation, career clarity sessions, and more with Coach Kagiso. Services for South African professionals.',
  alternates: {
    canonical: '/work-with-me',
  },
  openGraph: {
    title: 'Career Coaching & CV Services South Africa | Coach Kagiso',
    description:
      'CV reviews, LinkedIn optimisation, career clarity sessions, and more. Pricing from R150.',
    url: '/work-with-me',
  },
};

export const dynamic = 'force-dynamic';

const tracks: Track[] = [
  {
    id: 'show-up',
    eyebrow: 'Track 01',
    title: 'Fix how you show up',
    description:
      'For graduates, job seekers, and employed professionals who need their CV, LinkedIn, or online presence working harder.',
    icon: ClipboardCheck,
    services: [
      {
        title: '48-Hour CV Review',
        price: 'R150',
        tagline: 'Your CV, my expert eye. Back in under 48 hours.',
        body: "Send me your current CV. I'll record a 5-minute video walking you through what's broken, what's working, and what to fix first. This is feedback, not a rewrite. If you later want Kagiso to do the full rewrite, your R150 is credited toward the CV Revamp and you only pay the R250 difference.",
        items: [
          '5-minute review delivered within 48 hours',
          '3 specific fixes you can apply yourself',
          '3 strengths worth keeping',
          'Honest, no fluff',
        ],
        cta: 'Get my CV reviewed',
      },
      {
        title: 'CV Revamp',
        price: 'R400',
        tagline: "Built for the job you actually want, not the one you've outgrown.",
        body: 'Your full CV rewritten by me to read like a story of impact, not a list of duties. ATS-friendly. Recruiter-tested. Includes a 10-minute video walkthrough.',
        items: [
          '15-minute intake call or detailed form',
          'Full CV rewrite in Word and PDF',
          '10-Minute CV Walkthrough',
          '7-day revision window',
        ],
        cta: 'Revamp my CV',
      },
      {
        title: 'Cover Letter',
        price: 'R150',
        tagline: "For the role you're serious about.",
        body: "A cover letter written for one specific role you're applying for. Tailored to the job description, the company's language, and what makes you the right person for it.",
        items: [
          'Tailored cover letter for one named role',
          "Aligned to the job description and the company's voice",
          '7-day revision window',
        ],
        cta: 'Write my cover letter',
      },
      {
        title: 'LinkedIn Optimisation',
        price: 'R300',
        tagline: 'Stop being invisible to recruiters.',
        body: 'Your LinkedIn profile rewritten so the right people can find you. Built to attract opportunities, not just to look professional.',
        items: [
          'Headline rewrite',
          'About section rewrite',
          'Experience optimised for recruiter search keywords',
          '5 connection-request templates',
        ],
        cta: 'Optimise my LinkedIn',
      },
      {
        title: 'CV + LinkedIn Bundle',
        price: 'R500',
        tagline: 'Your full job-search toolkit, aligned.',
        body: 'Everything in the CV Revamp and LinkedIn Optimisation, built together so they tell the same story. Saves R200 on buying both separately.',
        items: [
          'Full CV Revamp',
          'Full LinkedIn Optimisation',
          'Aligned messaging across both',
          'Same revision window on both',
        ],
        cta: 'Get the bundle',
        featured: true,
        badge: 'Most popular for job seekers',
      },
    ],
  },
  {
    id: 'clarity',
    eyebrow: 'Track 02',
    title: "Figure out what's next",
    description:
      "For professionals who feel stuck, are considering a pivot, or know they want growth but aren't sure which direction.",
    icon: Compass,
    services: [
      {
        title: 'Career Clarity Session',
        price: 'R800',
        tagline: "When you don't know what's next, and you're tired of guessing.",
        body: 'Seventy-five minutes, just you and me, working through where you actually are and where you want to go. You leave with a written action plan for your next 30 days.',
        items: [
          '75-minute 1-on-1 session on Zoom',
          'Written 1-page action plan',
          'Skills pathway tailored to your goal',
          '14-day follow-up call',
        ],
        cta: 'Book my Clarity Session',
      },
    ],
  },
  {
    id: 'reset',
    eyebrow: 'Track 03',
    title: 'Get everything done',
    description:
      "For career changers and serious job seekers who want the full reset done with someone who's been through it.",
    icon: Layers3,
    services: [
      {
        title: 'Glow Up VIP Package',
        price: 'R1,200',
        tagline: 'Everything, sharpened. For when landing the role properly is the priority.',
        body: "Your CV, your LinkedIn, your interview prep, and 30 days of structured support so you don't lose momentum after the work is done.",
        items: [
          'Full CV Revamp',
          'Full LinkedIn Optimisation',
          '60-minute interview prep session',
          '30 days of structured support',
        ],
        cta: 'Book my Glow Up',
      },
    ],
  },
  {
    id: 'masterclass',
    eyebrow: 'Track 04',
    title: 'Learn with others',
    description:
      'For anyone who wants the structure of group coaching with the personalisation of a small room.',
    icon: UsersRound,
    services: [
      {
        title: 'Saturday Masterclass',
        price: 'R450 early bird · R500 after Sunday 7 June at 21:00',
        sessionLine: 'Saturday 4 July · 10:00 to 12:00 SAST',
        tagline: 'Two hours, twelve people, one real plan you leave with.',
        body: [
          'Live group coaching every second Saturday morning. We work through one career theme per session, in depth, in a small room, with real application to your situation.',
          'July session topic: From Stuck to Strategic. If your career has felt stagnant for months and you are not sure what to change, this session is built for you. You will leave with a clear picture of what is holding you back and a map of your next 90 days to move forward.',
        ],
        items: [
          '2-hour live session online',
          'Capped at 12 people',
          'Pre-session intake form',
          'Take-home pack and 14-day email follow-up',
          'R100 off CV Revamp or LinkedIn Package for 48 hours after class',
        ],
        cta: 'Secure my spot',
        note: 'Early bird closes Sunday 7 June at 21:00. After that, the standard price is R500.',
      },
    ],
  },
];

const workWithMeFaqs = [
  {
    question: 'How do I know which service is right for me?',
    answer: 'Use where you are right now as the guide. If you need sharper career materials, start with the service pages. If you feel stuck or unclear, start with the clarity path.',
  },
  {
    question: 'Can I start small and upgrade later?',
    answer: 'Yes. Many people begin with a lower-risk service like the CV Review, then move into a fuller rewrite or a bigger package once they have momentum.',
  },
  {
    question: 'Are these services only for people in finance?',
    answer: 'No. The work is grounded in strong positioning, clear communication, and practical career strategy across professional industries.',
  },
];

export default function WorkWithMePage() {
  const visibleTracks = tracks
    .filter((track) => FEATURE_FLAGS.masterclass || track.id !== 'masterclass')
    .map((track) =>
      track.id === 'masterclass'
        ? {
            ...track,
            services: track.services.map((service) =>
              service.title === 'Saturday Masterclass'
                ? {
                    ...service,
                    price: getMasterclassPriceLabel(),
                    note: getMasterclassPriceNote(),
                  }
                : service,
            ),
          }
        : track,
    );

  return (
    <main className="min-h-screen overflow-x-clip bg-[#FCFBFA] text-[#142334]">
      <FaqJsonLd items={workWithMeFaqs.map((item) => ({ question: item.question, answer: item.answer }))} />
      <Navbar />

      <section className="relative overflow-hidden bg-[#E4D8CB] pt-[124px] pb-20 lg:pb-28">
        <div className="absolute inset-x-0 top-24 pointer-events-none select-none text-center">
          <span className="font-serif text-[15vw] leading-none text-white/35 tracking-normal">
            WORK
          </span>
        </div>
        <FlowRibbon className="absolute -right-28 top-4 h-[700px] w-[520px] opacity-[0.18] text-[#142334] pointer-events-none" />

        <div className="relative z-10 max-w-[1180px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_0.62fr] gap-12 lg:gap-16 items-end">
            <Reveal direction="right">
              <p className="inline-flex rounded-full border border-[#142334]/25 px-4 py-1 text-[12px] font-semibold uppercase tracking-[0.25em] text-[#142334]/70">
                Work with me
              </p>
              <h1 className="mt-7 font-serif text-[52px] md:text-[86px] leading-[0.94] font-medium">
                Pick where you are. We&apos;ll go from there.
              </h1>
            </Reveal>

            <Reveal direction="left" delay={0.1}>
              <p className="text-[18px] leading-relaxed text-[#142334]/76">
                Whether you&apos;re job hunting, stuck in a role, or stepping into something new, there&apos;s a way in that fits where you actually are.
              </p>
              <p className="mt-5 text-[15px] leading-relaxed text-[#142334]/65">
                Not sure which one? Take the free 5-Minute Personal Brand Audit and the result will point you to the right package.
              </p>
              <Link
                href="/#leadmagnet"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#142334] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-white hover:text-[#142334]"
              >
                Take the audit <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      <WorkTrackNav items={visibleTracks.map(({ id, title }) => ({ id, title }))} />

      {visibleTracks.map((track, trackIndex) => {
        const Icon = track.icon;
        const isDark = trackIndex === 2;

        return (
          <section
            key={track.id}
            id={track.id}
            className={`relative py-20 lg:py-28 ${isDark ? 'bg-[#142334] text-white' : trackIndex % 2 === 0 ? 'bg-[#FCFBFA]' : 'bg-white'}`}
          >
            {trackIndex === 1 && (
              <ContourField className="absolute -right-36 top-0 h-[660px] w-[560px] opacity-[0.1] text-[#142334] pointer-events-none" />
            )}
            {trackIndex === 2 && (
              <ParallaxWord
                distance={260}
                className="absolute left-[-3%] bottom-[-8%] z-0 pointer-events-none select-none font-serif text-[clamp(150px,24vw,360px)] leading-none text-white/8 tracking-normal"
              >
                VIP
              </ParallaxWord>
            )}
            {trackIndex === 3 && (
              <GeoArchPattern className="absolute -left-24 top-12 h-[440px] w-[540px] opacity-[0.12] text-[#142334] pointer-events-none" />
            )}

            <div className="relative z-10 max-w-[1180px] mx-auto px-6 lg:px-8">
              <div className="grid lg:grid-cols-[0.42fr_1fr] gap-12 lg:gap-16 items-start">
                <Reveal direction="right" className="lg:sticky lg:top-36">
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${isDark ? 'bg-white/10 text-[#C9AD98]' : 'bg-[#E4D8CB] text-[#142334]'}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className={`mt-7 text-[12px] uppercase tracking-[0.22em] font-semibold ${isDark ? 'text-[#C9AD98]' : 'text-[#C9AD98]'}`}>
                    {track.eyebrow}
                  </p>
                  <h2 className="mt-4 font-serif text-[42px] md:text-[58px] leading-tight">
                    {track.title}
                  </h2>
                  <p className={`mt-5 text-[17px] leading-relaxed ${isDark ? 'text-white/72' : 'text-[#142334]/72'}`}>
                    {track.description}
                  </p>
                </Reveal>

                <div className="space-y-5">
                  {track.services.map((service, serviceIndex) => (
                    <Reveal key={service.title} direction="left" delay={serviceIndex * 0.06}>
                      <article
                        className={`relative overflow-hidden border p-6 md:p-8 ${
                          service.featured
                            ? 'border-[#C9AD98] bg-[#F7F1EC] shadow-[0_28px_80px_rgba(20,35,52,0.12)]'
                            : isDark
                              ? 'border-white/12 bg-white/[0.04]'
                              : 'border-[#D8C8BB] bg-white'
                        }`}
                      >
                        {service.badge && (
                          <span className="mb-5 inline-flex rounded-full bg-[#C9AD98] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#142334]">
                            {service.badge}
                          </span>
                        )}
                        <div className="grid gap-6 lg:grid-cols-[0.78fr_1fr] lg:gap-10">
                          <div>
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                              <h3 className="font-serif text-[34px] md:text-[42px] leading-[1.02]">
                                {service.title}
                              </h3>
                              {service.title === 'CV + LinkedIn Bundle' ? (
                                <span className="text-right">
                                  {/* TEMP: July 2026 month-end special, R400 instead of R500. Revert to R500 after 31 July 2026. */}
                                  <span className={`block text-[12px] leading-relaxed ${isDark ? 'text-white/60' : 'text-[#142334]/60'}`}>
                                    Special ends 31 July 2026.
                                  </span>
                                  <span className="block font-serif text-[18px] text-[#C9AD98]/60 line-through">
                                    R500
                                  </span>
                                  <span className="block font-serif text-[25px] text-[#C9AD98]">
                                    R400
                                  </span>
                                </span>
                              ) : (
                                <span className={`font-serif text-[25px] ${isDark ? 'text-[#C9AD98]' : 'text-[#C9AD98]'}`}>
                                  {service.price}
                                </span>
                              )}
                            </div>
                            {service.sessionLine && (
                              <p className={`mt-4 text-[16px] leading-relaxed ${isDark ? 'text-white/66' : 'text-[#142334]/72'}`}>
                                {service.sessionLine}
                              </p>
                            )}
                            <p className={`mt-4 font-serif text-[22px] italic leading-snug ${isDark ? 'text-white/76' : 'text-[#142334]/72'}`}>
                              {service.tagline}
                            </p>
                            {(Array.isArray(service.body) ? service.body : [service.body]).map((paragraph) => (
                              <p key={paragraph} className={`mt-5 text-[16px] leading-relaxed ${isDark ? 'text-white/66' : 'text-[#142334]/72'}`}>
                                {paragraph}
                              </p>
                            ))}
                            {service.note && (
                              <p className="mt-5 border-l border-[#C9AD98] pl-4 text-[14px] leading-relaxed text-[#C9AD98]">
                                {service.note}
                              </p>
                            )}
                          </div>

                          <div>
                            <p className={`text-[11px] uppercase tracking-[0.18em] font-semibold ${isDark ? 'text-[#C9AD98]' : 'text-[#A09086]'}`}>
                              What you get
                            </p>
                            <ul className="mt-4 space-y-3">
                              {service.items.map((item) => (
                                <li key={item} className="flex gap-3">
                                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#C9AD98]" />
                                  <span className={`text-[15px] leading-relaxed ${isDark ? 'text-white/72' : 'text-[#142334]/74'}`}>
                                    {item}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <Link
                              href={getServiceRoute(service.title)}
                              className={`mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] transition ${
                                isDark
                                  ? 'bg-[#C9AD98] text-[#142334] hover:bg-white'
                                  : 'bg-[#142334] text-white hover:bg-[#C9AD98] hover:text-[#142334]'
                              }`}
                            >
                              {service.cta} <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </article>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      <PageFaq
        eyebrow="Before you commit"
        title="The questions people usually ask at this stage."
        description="This page is where people compare options, hesitate, and decide what kind of support feels right. These answers are here to make that easier."
        items={workWithMeFaqs}
        ctaHref="/contact"
        ctaLabel="Ask a question"
        backgroundClassName="bg-white"
      />

      <section className="relative overflow-hidden bg-white py-20 lg:py-28">
        <GeoArchPattern className="absolute -right-20 top-10 h-[420px] w-[520px] opacity-[0.12] text-[#142334] pointer-events-none" />
        <div className="relative z-10 max-w-[1180px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.86fr_1fr] gap-12 lg:gap-16 items-start">
            <Reveal direction="right">
              <div className="border border-[#D8C8BB] bg-[#142334] p-8 md:p-10 text-white">
                <p className="text-[12px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
                  Free LinkedIn tool
                </p>
                <h2 className="mt-5 font-serif text-[42px] md:text-[58px] leading-[0.98]">
                  Start with the headline before you pay for the full rewrite.
                </h2>
                <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/72">
                  The SA LinkedIn Headline Builder gives you the recruiter formula, the keyword bank by industry, and 39 before-and-after rewrites you can adapt immediately.
                </p>
                <div className="mt-8 space-y-4 border-y border-white/12 py-7">
                  {[
                    '39 before-and-after rewrites across SA career paths',
                    'The exact formula SA recruiters actually reward',
                    'Industry keyword banks for finance, HR, operations, tech, mining, sales, and more',
                  ].map((item) => (
                    <div key={item} className="text-[15px] leading-relaxed text-white/76">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal direction="left" delay={0.08}>
              <div className="border border-[#D8C8BB] bg-[#FCFBFA] p-8 md:p-10">
                <p className="text-[12px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                  Email-gated PDF
                </p>
                <h3 className="mt-5 font-serif text-[38px] md:text-[52px] leading-tight text-[#142334]">
                  Get the premium version.
                </h3>
                <p className="mt-4 text-[16px] leading-relaxed text-[#142334]/72">
                  We&apos;ll email the PDF and also give you an instant download link after the form submits, so there&apos;s no dead-end moment.
                </p>
                <LinkedInHeadlineBuilderForm source="work-with-me" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#E4D8CB] py-20 lg:py-28">
        <ParallaxWord
          distance={280}
          className="absolute left-[5%] bottom-[-7%] z-0 pointer-events-none select-none font-serif text-[clamp(145px,22vw,330px)] leading-none text-white/35 tracking-normal"
        >
          AUDIT
        </ParallaxWord>
        <div className="relative z-10 max-w-[1040px] mx-auto px-6 lg:px-8 text-center">
          <Reveal>
            <p className="text-[12px] uppercase tracking-[0.22em] font-semibold text-[#142334]/62">
              Not sure which one fits?
            </p>
            <h2 className="mt-5 font-serif text-[42px] md:text-[62px] leading-tight">
              Let the audit point you to the right package.
            </h2>
            <p className="mt-6 mx-auto max-w-2xl text-[17px] leading-relaxed text-[#142334]/74">
              Thirty yes/no questions. You&apos;ll get a grade and a 7-day fix list, and the result will tell you which package fits where you are right now.
            </p>
            <Link
              href="/#leadmagnet"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#142334] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-white hover:text-[#142334]"
            >
              Take the free audit <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="bg-[#FCFBFA] py-14">
        <div className="max-w-[980px] mx-auto px-6 lg:px-8">
          <Reveal>
            <p className="border-y border-[#142334]/15 py-7 text-center text-[15px] leading-relaxed text-[#142334]/72">
              If R400 isn&apos;t possible right now, the R150 CV Review is built for you. Same eye, no rewrite. Payment plans on packages over R800 via PayJustNow. If finances are genuinely the barrier, message me directly. I sponsor one CV Revamp every quarter for someone who can&apos;t afford it.
            </p>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
