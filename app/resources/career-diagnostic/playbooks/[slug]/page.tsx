import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ArrowUpRight, Compass, Download, Grid3X3, NotebookPen, Radio, Shield, Star } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import { FlowRibbon, GeoArchPattern } from '@/components/DecorativeMotifs';
import { archetypes, getDiagnosticPlaybookBySlug, optionKeys } from '@/lib/career-diagnostic';

type DiagnosticPlaybookPageProps = {
  params: Promise<{ slug: string }>;
};

const symbolIcons: Record<string, LucideIcon> = {
  A: Star,
  B: Radio,
  C: Shield,
  D: Compass,
  E: Grid3X3,
};

export async function generateMetadata({
  params,
}: DiagnosticPlaybookPageProps): Promise<Metadata> {
  const { slug } = await params;
  const archetype = getDiagnosticPlaybookBySlug(slug);

  if (!archetype) return {};

  return {
    title: `${archetype.name} Playbook | Coach Kagiso`,
    description: archetype.playbook.intro,
    alternates: {
      canonical: `/resources/career-diagnostic/playbooks/${slug}`,
    },
    openGraph: {
      title: `${archetype.name} Playbook | Coach Kagiso`,
      description: archetype.playbook.intro,
      url: `/resources/career-diagnostic/playbooks/${slug}`,
    },
  };
}

export function generateStaticParams() {
  return ['plateaued-performer', 'quiet-pivoter', 'burnt-out-builder', 'lost-pivoter', 'engaged-strategist'].map(
    (slug) => ({ slug })
  );
}

export default async function DiagnosticPlaybookPage({
  params,
}: DiagnosticPlaybookPageProps) {
  const { slug } = await params;
  const archetype = getDiagnosticPlaybookBySlug(slug);

  if (!archetype) {
    notFound();
  }

  const SymbolIcon = symbolIcons[archetype.key] || Compass;
  const relatedPlaybooks = optionKeys
    .map((key) => archetypes[key])
    .filter((item) => item.playbook.slug !== archetype.playbook.slug);

  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-x-clip bg-[#FCFBFA] text-[#142334]">
        <section className="relative overflow-hidden bg-[#E4D8CB] pt-[124px] pb-20 lg:pb-28">
          <div className="absolute inset-x-0 top-24 pointer-events-none select-none text-center">
            <span className="font-serif text-[13vw] leading-none text-white/35 tracking-normal">
              PLAYBOOK
            </span>
          </div>
          <FlowRibbon className="absolute -right-28 top-4 h-[690px] w-[520px] opacity-[0.16] text-[#142334] pointer-events-none" />

          <div className="relative z-10 mx-auto max-w-[1180px] px-6 lg:px-8">
            <Reveal className="max-w-5xl">
              <Link
                href="/resources/career-diagnostic"
                className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] font-semibold text-[#142334]/65 hover:text-[#142334]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to diagnostic
              </Link>
              <p className="mt-8 inline-flex rounded-full border border-[#142334]/25 px-4 py-1 text-[12px] font-semibold uppercase tracking-[0.25em] text-[#142334]/70">
                {archetype.name}
              </p>
              <div className="mt-6 flex max-w-xl items-center gap-4 border border-[#D8C8BB] bg-white/42 p-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center border border-[#C9AD98] bg-[#FCFBFA] text-[#142334]">
                  <SymbolIcon className="h-6 w-6" strokeWidth={1.4} />
                </span>
                <div>
                  <p className="font-serif text-[24px] leading-tight text-[#142334]">
                    {archetype.symbol.label}
                  </p>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#142334]/68">
                    {archetype.symbol.meaning}
                  </p>
                </div>
              </div>
              <h1 className="mt-7 font-serif text-[50px] md:text-[82px] leading-[0.94] font-medium">
                {archetype.playbook.title}
              </h1>
              <p className="mt-7 max-w-3xl text-[18px] leading-relaxed text-[#142334]/76">
                {archetype.playbook.intro}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={`/api/diagnostic/playbook-pdf/${archetype.playbook.slug}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#142334] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                >
                  Download PDF <Download className="h-4 w-4" />
                </a>
                <Link
                  href={archetype.href}
                  className="inline-flex items-center gap-2 rounded-full border border-[#142334]/25 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#142334]"
                >
                  {archetype.cta} <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="relative bg-[#FCFBFA] py-16 lg:py-24">
          <GeoArchPattern className="absolute -left-24 top-10 h-[460px] w-[560px] opacity-[0.08] text-[#142334] pointer-events-none" />
          <div className="relative z-10 mx-auto max-w-[1180px] px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.82fr_1fr] lg:items-start">
              <aside className="border border-[#D8C8BB] bg-white p-7 md:p-8 lg:sticky lg:top-28 lg:self-start">
                  <Compass className="h-8 w-8 text-[#C9AD98]" />
                  <h2 className="mt-6 font-serif text-[34px] leading-tight">What this result is trying to tell you.</h2>
                  <p className="mt-5 text-[16px] leading-relaxed text-[#142334]/72">
                    {archetype.diagnosis}
                  </p>
                  <div className="mt-8 border-t border-[#142334]/12 pt-6">
                    <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#A09086]">
                      Journal prompt
                    </p>
                    <p className="mt-4 font-serif text-[28px] leading-tight text-[#142334]">
                      {archetype.playbook.journalPrompt}
                    </p>
                  </div>
              </aside>

              <Reveal direction="left" delay={0.08}>
                <div className="grid gap-8">
                  <section className="border border-[#D8C8BB] bg-white p-7 md:p-8">
                    <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                      {archetype.playbook.signalsTitle}
                    </p>
                    <div className="mt-5 grid gap-3">
                      {archetype.playbook.signals.map((item, index) => (
                        <div key={item} className="grid grid-cols-[38px_1fr] gap-4 border border-[#D8C8BB] bg-[#FCFBFA] p-4">
                          <span className="font-serif text-[24px] leading-none text-[#C9AD98]">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <p className="text-[15px] leading-relaxed text-[#142334]/72">{item}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="border border-[#D8C8BB] bg-[#F7F1EC] p-7 md:p-8">
                    <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                      {archetype.playbook.prioritiesTitle}
                    </p>
                    <div className="mt-5 grid gap-3">
                      {archetype.playbook.priorities.map((item, index) => (
                        <div key={item} className="grid grid-cols-[38px_1fr] gap-4 border border-[#D8C8BB] bg-white p-4">
                          <span className="font-serif text-[24px] leading-none text-[#C9AD98]">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <p className="text-[15px] leading-relaxed text-[#142334]/72">{item}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="border border-[#C9AD98]/55 bg-[#142334] p-7 md:p-8 text-white">
                    <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
                      {archetype.playbook.progressTitle}
                    </p>
                    <div className="mt-5 grid gap-3">
                      {archetype.playbook.progress.map((item, index) => (
                        <div key={item} className="grid grid-cols-[38px_1fr] gap-4 border border-white/12 bg-white/5 p-4">
                          <span className="font-serif text-[24px] leading-none text-[#C9AD98]">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <p className="text-[15px] leading-relaxed text-white/74">{item}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="border border-[#D8C8BB] bg-white p-7 md:p-8">
                    <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
                          Best next move
                        </p>
                        <h2 className="mt-4 max-w-2xl font-serif text-[32px] leading-tight md:text-[42px]">
                          {archetype.nextStepTitle}
                        </h2>
                        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#142334]/70">
                          {archetype.nextStepBody}
                        </p>
                      </div>
                      <Link
                        href={archetype.href}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#142334] px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                      >
                        {archetype.cta} <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                    <div className="mt-8 border-t border-[#142334]/12 pt-6">
                      <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#A09086]">
                        Keep this near you
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href="/resources/career-diagnostic"
                          className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#142334] transition hover:border-[#142334]"
                        >
                          Retake diagnostic <NotebookPen className="h-4 w-4" />
                        </Link>
                        <Link
                          href={archetype.readNextPath.href}
                          className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#142334] transition hover:border-[#142334]"
                        >
                          {archetype.readNextPath.cta} <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </section>

                  <section className="border border-[#D8C8BB] bg-[#F7F1EC] p-7 md:p-8">
                    <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
                      Other playbooks
                    </p>
                    <h2 className="mt-4 max-w-2xl font-serif text-[32px] leading-tight md:text-[42px]">
                      The diagnostic has five possible patterns.
                    </h2>
                    <div className="mt-7 grid gap-4 md:grid-cols-2">
                      {relatedPlaybooks.map((item) => {
                        const RelatedIcon = symbolIcons[item.key] || Compass;
                        return (
                          <Link
                            key={item.key}
                            href={`/resources/career-diagnostic/playbooks/${item.playbook.slug}`}
                            className="group border border-[#D8C8BB] bg-white p-5 transition hover:border-[#142334]"
                          >
                            <div className="flex items-start gap-4">
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#C9AD98]/70 text-[#C9AD98] transition group-hover:bg-[#142334] group-hover:text-white">
                                <RelatedIcon className="h-5 w-5" strokeWidth={1.5} />
                              </span>
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#A09086]">
                                  {item.symbol.label}
                                </p>
                                <h3 className="mt-2 font-serif text-[25px] leading-tight text-[#142334]">
                                  {item.name}
                                </h3>
                                <p className="mt-3 text-[14px] leading-relaxed text-[#142334]/66">
                                  {item.tagline}
                                </p>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
