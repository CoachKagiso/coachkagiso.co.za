import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Bell,
  ClipboardList,
  Download,
  FileSearch,
  FileText,
  PenLine,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import LinkedInHeadlineBuilderForm from '@/components/LinkedInHeadlineBuilderForm';
import First90DaysChecklistForm from '@/components/First90DaysChecklistForm';
import SaCvChecklistForm from '@/components/SaCvChecklistForm';
import { GeoArchPattern } from '@/components/DecorativeMotifs';

export const metadata: Metadata = {
  title: 'Free Career Downloads & Checklists South Africa',
  description:
    'Free career checklists, CV prompts, and downloadable resources from Coach Kagiso for professionals building clarity and visibility.',
  alternates: {
    canonical: '/resources/downloads',
  },
  openGraph: {
    title: 'Free Career Downloads | Coach Kagiso',
    description:
      'Free career checklists, CV prompts, and downloadable resources for South African professionals.',
    url: '/resources/downloads',
  },
};

const downloads = [
  {
    title: 'LinkedIn About Prompts',
    type: 'Prompt guide',
    time: '20 minutes',
    description:
      'Guided prompts to help you write a LinkedIn About section that sounds like you and makes your value easier to understand.',
    status: 'In development',
    icon: PenLine,
  },
  {
    title: 'Interview Story Bank',
    type: 'Workbook',
    time: '30 minutes',
    description:
      'A structure for gathering proof stories before interviews so you are not trying to remember your value under pressure.',
    status: 'On the list',
    icon: FileText,
  },
];

export default function DownloadsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#FCFBFA] text-[#142334]">
      <Navbar />

      <section className="relative overflow-hidden bg-[#E4D8CB] pt-[124px] pb-20 lg:pb-28">
        <div className="absolute inset-x-0 top-24 pointer-events-none select-none text-center">
          <span className="font-serif text-[14vw] leading-none text-white/35 tracking-normal">
            DOWNLOADS
          </span>
        </div>
        <GeoArchPattern className="absolute -right-24 top-12 h-[470px] w-[580px] opacity-[0.16] text-[#142334] pointer-events-none" />

        <div className="relative z-10 max-w-[1180px] mx-auto px-6 lg:px-8">
          <Reveal className="max-w-4xl">
            <Link href="/resources" className="text-[12px] uppercase tracking-[0.2em] font-semibold text-[#142334]/65 hover:text-[#142334]">
              Resources / Downloads
            </Link>
            <h1 className="mt-7 font-serif text-[52px] md:text-[86px] leading-[0.94] font-medium">
              Free resources for clearer career decisions.
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-relaxed text-[#142334]/76">
              Downloadable worksheets, checklists, and prompts for the moments when you need structure, language, or a next step you can actually use.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-[#FCFBFA] py-20 lg:py-28">
        <div className="max-w-[1180px] mx-auto px-6 lg:px-8">
          <div id="sa-cv-checklist">
            <Reveal direction="right">
              <div className="relative overflow-hidden bg-[#142334] p-8 md:p-10 lg:p-12 text-white">
                <div className="grid gap-10 lg:grid-cols-[0.95fr_0.78fr] lg:items-start">
                  <div>
                    <FileSearch className="h-9 w-9 text-[#C9AD98]" />
                    <p className="mt-8 text-[12px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
                      Available now
                    </p>
                    <h2 className="mt-4 max-w-2xl font-serif text-[44px] md:text-[64px] leading-[0.98]">
                      The South African CV Checklist
                    </h2>
                    <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/74">
                      Fifteen checks that decide whether your CV gets seen. Score your own CV in about ten minutes with a simple green, amber, and red system, then fix what matters most before you apply again.
                    </p>
                    <div className="mt-8 border-y border-white/12 py-6">
                      <p className="text-[12px] uppercase tracking-[0.2em] font-semibold text-[#C9AD98]">
                        Inside the PDF
                      </p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {[
                          ['15 checks', 'A self-audit across how your CV reads, what belongs on an SA CV, and what earns the shortlist'],
                          ['Traffic-light scoring', 'A green, amber, or red light for every check, so you know exactly where you stand'],
                          ['SA-specific rules', 'ID numbers, photos, NQF levels, and the local conventions recruiters here expect'],
                          ['Free', 'Delivered instantly and emailed to your inbox'],
                        ].map(([label, note]) => (
                          <div key={label} className="border border-white/12 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-white/72">
                              {label}
                            </p>
                            <p className="mt-3 text-[13px] leading-relaxed text-white/62">
                              {note}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 grid gap-2 sm:grid-cols-4">
                        {['How it reads', 'What belongs', 'Shortlist signals', 'Your red count'].map((item) => (
                          <div key={item} className="border border-[#C9AD98]/30 px-3 py-3 text-center">
                            <span className="text-[11px] uppercase tracking-[0.14em] text-[#C9AD98]">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#D8C8BB] bg-white p-6 md:p-8 text-[#142334]">
                    <h3 className="font-serif text-[34px] md:text-[44px] leading-tight">
                      Send me the checklist.
                    </h3>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#142334]/72">
                      We&apos;ll email the PDF and give you an instant download link after submission.
                    </p>
                    <SaCvChecklistForm source="downloads-page" compact />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <div id="first-90-days-checklist">
            <Reveal direction="right" className="mt-10">
              <div className="relative overflow-hidden border border-[#D8C8BB] bg-white p-8 md:p-10 lg:p-12 text-[#142334]">
                <div className="absolute -right-28 -top-24 h-72 w-72 rounded-full border border-[#E4D8CB] opacity-60" />
                <div className="grid gap-10 lg:grid-cols-[0.98fr_0.72fr] lg:items-start">
                  <div>
                    <ClipboardList className="h-9 w-9 text-[#C9AD98]" />
                    <p className="mt-8 text-[12px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
                      Available now
                    </p>
                    <h2 className="mt-4 max-w-3xl font-serif text-[44px] md:text-[64px] leading-[0.98]">
                      The First 90 Days Checklist for New Managers
                    </h2>
                    <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-[#142334]/74">
                      A South African manager operating kit for the promotion moment: checklists, scripts, a scorecard, a listening tour question bank, and a Day 90 impact report template.
                    </p>

                    <div className="mt-8 border-y border-[#D8C8BB] py-6">
                      <p className="text-[12px] uppercase tracking-[0.2em] font-semibold text-[#C9AD98]">
                        Inside the PDF
                      </p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {[
                          ['4-phase plan', 'Week 1, Weeks 2-4, Month 2, and Month 3 actions'],
                          ['Manager scorecard', 'Rate trust, clarity, rhythm, delivery, and SA awareness'],
                          ['Scripts and questions', 'Former-peer reset, listening tour, and stakeholder prompts'],
                          ['Impact report', 'A Day 90 update structure your manager can actually use'],
                        ].map(([label, note]) => (
                          <div key={label} className="border border-[#D8C8BB] bg-[#FCFBFA] p-4">
                            <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#142334]/72">
                              {label}
                            </p>
                            <p className="mt-3 text-[13px] leading-relaxed text-[#142334]/62">
                              {note}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 grid gap-2 sm:grid-cols-4">
                        {['Trust', 'Fairness', 'Rhythm', 'Delivery'].map((item) => (
                          <div key={item} className="border border-[#C9AD98]/50 px-3 py-3 text-center">
                            <span className="text-[11px] uppercase tracking-[0.14em] text-[#8F7462]">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#D8C8BB] bg-[#FCFBFA] p-6 md:p-8 text-[#142334]">
                    <Download className="h-8 w-8 text-[#C9AD98]" />
                    <h3 className="mt-6 font-serif text-[34px] md:text-[44px] leading-tight">
                      Send me the manager kit.
                    </h3>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#142334]/72">
                      We&apos;ll email the PDF and give you an instant download link after submission.
                    </p>
                    <First90DaysChecklistForm source="downloads-page" compact />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <div id="linkedin-headline-builder">
            <Reveal direction="right" className="mt-10">
              <div className="relative overflow-hidden bg-[#142334] p-8 md:p-10 lg:p-12 text-white">
                <div className="grid gap-10 lg:grid-cols-[0.95fr_0.78fr] lg:items-start">
                  <div>
                    <Download className="h-9 w-9 text-[#C9AD98]" />
                    <p className="mt-8 text-[12px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
                      Available now
                    </p>
                    <h2 className="mt-4 max-w-2xl font-serif text-[44px] md:text-[64px] leading-[0.98]">
                      The SA LinkedIn Headline Builder
                    </h2>
                    <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/74">
                      Use this when your LinkedIn headline still reads like a label instead of a search signal. It includes 39 before-and-after rewrites, the recruiter formula, and the keyword bank by industry.
                    </p>
                    <div className="mt-8 border-y border-white/12 py-6">
                      <p className="text-[12px] uppercase tracking-[0.2em] font-semibold text-[#C9AD98]">
                        Inside the PDF
                      </p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {[
                          ['39 rewrites', 'Before-and-after examples across SA career paths'],
                          ['Recruiter formula', 'Role, specialty, proof, and credibility in one line'],
                          ['Keyword bank', 'Industry language for finance, HR, tech, mining, retail, and more'],
                          ['Free', 'Delivered instantly and emailed to your inbox'],
                        ].map(([label, note]) => (
                          <div key={label} className="border border-white/12 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-white/72">
                              {label}
                            </p>
                            <p className="mt-3 text-[13px] leading-relaxed text-white/62">
                              {note}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 grid gap-2 sm:grid-cols-4">
                        {['Target role', 'Specialty', 'Proof', 'Location'].map((item) => (
                          <div key={item} className="border border-[#C9AD98]/30 px-3 py-3 text-center">
                            <span className="text-[11px] uppercase tracking-[0.14em] text-[#C9AD98]">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#D8C8BB] bg-white p-6 md:p-8 text-[#142334]">
                    <h3 className="font-serif text-[34px] md:text-[44px] leading-tight">
                      Send it to my inbox.
                    </h3>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#142334]/72">
                      We&apos;ll email the PDF and give you an instant download link after submission.
                    </p>
                    <LinkedInHeadlineBuilderForm source="downloads-page" compact />
                  </div>
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
              Resource library
            </p>
            <h2 className="mt-4 font-serif text-[42px] md:text-[56px] leading-tight">
              More downloads are being built for the library.
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5">
            {downloads.map((download, index) => {
              const Icon = download.icon;
              return (
                <Reveal key={download.title} delay={index * 0.08}>
                  <article className="min-h-[390px] border border-[#D8C8BB] bg-[#FCFBFA] p-7">
                    <div className="flex items-start justify-between gap-4">
                      <Icon className="h-7 w-7 text-[#C9AD98]" />
                      <span className="rounded-full border border-[#C9AD98]/60 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#A09086]">
                        {download.status}
                      </span>
                    </div>
                    <h3 className="mt-12 font-serif text-[34px] leading-[1.02]">{download.title}</h3>
                    <p className="mt-5 text-[16px] leading-relaxed text-[#142334]/72">
                      {download.description}
                    </p>
                    <div className="mt-7 flex flex-wrap gap-2">
                      {[download.type, download.time].map((meta) => (
                        <span key={meta} className="rounded-full bg-[#E4D8CB]/70 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[#142334]/70">
                          {meta}
                        </span>
                      ))}
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#E4D8CB] py-16">
        <Reveal className="max-w-[980px] mx-auto px-6 lg:px-8 text-center">
          <Bell className="mx-auto h-7 w-7 text-[#142334]/60" />
          <h2 className="mt-5 font-serif text-[38px] md:text-[52px] leading-tight">
            Want first access when downloads go live?
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#142334]/72">
            Join the career note and get new resources when they are ready.
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
