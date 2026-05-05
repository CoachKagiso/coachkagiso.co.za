'use client';

import { useMemo, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ClipboardCheck, Clock, Compass, FileText, Search } from 'lucide-react';
import { Insight, insightTags, insights } from '@/lib/insights';

function ArticleTile({ article, index }: { article: Insight; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: index * 0.05 }}
      className="group border-t border-[#142334]/15 pt-6"
    >
      <Link href={`/insights/${article.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#E4D8CB] rounded-tl-[20px] rounded-br-[20px]">
          <Image
            src={article.image}
            alt={article.imageAlt}
            fill
            referrerPolicy="no-referrer"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        <div className="pt-6">
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.18em] font-semibold text-[#A09086]">
            <span>{article.category}</span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {article.readTime}
            </span>
          </div>
          <h3 className="mt-3 font-serif text-[27px] leading-tight text-[#142334] group-hover:text-[#C9AD98] transition-colors">
            {article.title}
          </h3>
          <p className="mt-4 text-[15.5px] leading-relaxed text-[#142334]/72">{article.dek}</p>
          <div className="mt-5 inline-flex items-center text-[12px] uppercase tracking-[0.2em] font-semibold text-[#142334] relative group">
            Read article <ArrowUpRight className="h-4 w-4" />
            <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#C9AD98] transition-all duration-300 group-hover:w-full"></span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

function FeaturedArticleTile({ article }: { article: Insight }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="group lg:col-span-3"
    >
      <Link href={`/insights/${article.slug}`} className="grid overflow-hidden bg-[#142334] text-white shadow-[0_28px_80px_rgba(20,35,52,0.18)] md:grid-cols-[1.05fr_0.95fr]">
        <div className="relative min-h-[320px] overflow-hidden bg-[#142334] md:min-h-[460px]">
          <Image
            src={article.image}
            alt={article.imageAlt}
            fill
            priority
            referrerPolicy="no-referrer"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        <div className="flex min-h-[320px] flex-col justify-between p-8 md:p-10 lg:p-12">
          <div>
            <div className="inline-flex border border-[#C9AD98]/60 px-3 py-1 text-[10px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
              Featured article
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.18em] font-semibold text-white/52">
              <span>{article.category}</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {article.readTime}
              </span>
            </div>
            <h3 className="mt-5 max-w-2xl font-serif text-[42px] leading-[1.02] transition-colors group-hover:text-[#C9AD98] md:text-[58px]">
              {article.title}
            </h3>
            <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-white/72">{article.dek}</p>
          </div>
          <span className="mt-10 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] font-semibold text-[#C9AD98]">
            Read featured article <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </span>
        </div>
      </Link>
    </motion.article>
  );
}

const freeTools = [
  {
    title: 'Personal Brand Audit',
    body: 'A quick visibility check for your CV, LinkedIn, positioning, and the rooms where your name needs to travel.',
    href: '/#leadmagnet',
    icon: Compass,
  },
  {
    title: 'ATS CV Checklist',
    body: 'Use this before applying to check whether your CV can pass the first software filter.',
    href: '/resources/ats-cv-checklist',
    icon: FileText,
  },
  {
    title: 'First 90 Days Checklist',
    body: 'A calmer weekly structure for professionals stepping into management for the first time.',
    href: '/resources/first-90-days-checklist',
    icon: ClipboardCheck,
  },
];

export default function InsightsIndex() {
  const [activeTag, setActiveTag] = useState('All');
  const featured = insights.find((article) => article.featured) ?? insights[0];

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start end', 'end start'],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [-150, 0]);

  const filtered = useMemo(() => {
    const sortFeaturedFirst = (articles: Insight[]) =>
      [...articles].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));

    if (activeTag === 'All') {
      return sortFeaturedFirst(insights);
    }
    return sortFeaturedFirst(insights.filter((article) => article.tags.includes(activeTag)));
  }, [activeTag]);

  return (
    <main className="font-sans bg-[#FCFBFA] text-[#142334] overflow-hidden">
      <section ref={heroRef} className="relative min-h-[92svh] pt-[72px] bg-[#E8E3DF] flex items-center">
        <div className="absolute inset-x-0 top-24 pointer-events-none select-none overflow-hidden text-center">
          <motion.div style={{ y: parallaxY, marginTop: '2rem' }} className="will-change-transform">
            <span className="font-serif text-[21vw] md:text-[15vw] leading-none text-white/65 tracking-normal">
              INSIGHTS
            </span>
          </motion.div>
        </div>
        <div className="absolute inset-0 opacity-[0.08]">
          <svg viewBox="0 0 1200 820" className="w-full h-full" fill="none">
            <path d="M-90 190 C 220 40, 420 380, 700 170 C 940 -10, 1050 160, 1280 30" stroke="#142334" strokeWidth="1" />
            <path d="M-70 350 C 180 210, 500 520, 790 290 C 1010 115, 1120 290, 1290 170" stroke="#142334" strokeWidth="1" />
            <path d="M-80 530 C 210 370, 490 700, 840 465 C 1030 340, 1130 455, 1280 360" stroke="#142334" strokeWidth="1" />
          </svg>
        </div>

        <div className="relative z-10 max-w-[1240px] mx-auto px-6 lg:px-8 py-20 lg:py-28 w-full">
          <div className="max-w-4xl">
              <p className="inline-block border border-[#A09086]/50 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.25em] uppercase text-[#A09086]">
                Career Field Notes
              </p>
              <h1 className="mt-6 font-serif font-medium text-[48px] md:text-[78px] lg:text-[96px] leading-[0.95] tracking-normal">
                Read before you move.
              </h1>
              <p className="mt-8 max-w-[540px] text-[18px] leading-relaxed text-[#142334]/80">
                Clear, practical writing for people who are capable, overlooked, changing direction, or trying to become visible before the next opportunity appears.
              </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 border-y border-[#142334]/10">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-8">
          <div className="grid gap-7 lg:grid-cols-[230px_1fr] lg:items-start">
            <div className="flex items-start gap-4 text-[#142334]/70">
              <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D8C8BB] text-[#C9AD98]">
                <Search className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[12px] uppercase tracking-[0.22em] font-semibold text-[#142334]">Browse by topic</p>
                <p className="mt-2 text-[13px] leading-relaxed text-[#142334]/55">
                  Choose a lane, then scan the field notes.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5 lg:justify-end">
              {['All', ...insightTags].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.15em] font-semibold transition-all duration-300 md:px-5 ${
                    activeTag === tag
                      ? 'border-[#142334] bg-[#142334] text-white shadow-[0_12px_28px_rgba(20,35,52,0.12)]'
                      : 'border-[#D8C8BB] bg-[#FCFBFA] text-[#142334]/72 hover:border-[#C9AD98] hover:text-[#142334]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#FCFBFA] py-20 lg:py-28">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-14">
            <div className="max-w-2xl">
              <p className="inline-flex w-fit items-center rounded-full border border-[#D8C8BB] bg-white/70 px-4 py-1.5 text-[12px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">Latest thinking</p>
              <h2 className="mt-4 font-serif text-[40px] md:text-[56px] leading-tight">
                Strategies for the work behind the work.
              </h2>
            </div>
            <p className="max-w-sm text-[15px] leading-relaxed text-[#142334]/70">
              Browse by topic now. As the library grows, this grid keeps the archive fast to scan without losing the editorial feel.
            </p>
          </div>

          {filtered.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
              {filtered.map((article, index) =>
                article.featured ? (
                  <FeaturedArticleTile key={article.slug} article={article} />
                ) : (
                  <ArticleTile key={article.slug} article={article} index={index} />
                )
              )}
            </div>
          ) : (
            <div className="border-t border-[#142334]/15 pt-10">
              <h3 className="font-serif text-[32px]">Nothing in this topic yet.</h3>
              <p className="mt-3 text-[#142334]/70">Try another tag while the real article library is being built.</p>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-20 lg:py-28 border-t border-[#142334]/10">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.75fr_1fr] gap-12 lg:gap-16 lg:items-start">
            <div>
              <p className="inline-flex w-fit items-center rounded-full border border-[#D8C8BB] bg-[#FCFBFA] px-4 py-1.5 text-[12px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">Start here</p>
              <h2 className="mt-4 font-serif text-[42px] md:text-[58px] leading-tight">
                Free tools for the move you are trying to make.
              </h2>
              <p className="mt-6 max-w-md text-[16px] leading-relaxed text-[#142334]/72">
                Not every article needs a lead magnet inside it. These tools live here as a clear resource shelf, while individual posts show a matched CTA only when it makes sense.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {freeTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.title}
                    href={tool.href}
                    className="group min-h-[260px] border border-[#CDC6C3] bg-[#FCFBFA] p-6 flex flex-col justify-between hover:border-[#142334] hover:-translate-y-1 transition-all duration-300"
                  >
                    <div>
                      <Icon className="h-6 w-6 text-[#C9AD98]" />
                      <h3 className="mt-8 font-serif text-[27px] leading-tight group-hover:text-[#C9AD98] transition">
                        {tool.title}
                      </h3>
                      <p className="mt-5 text-[14.5px] leading-relaxed text-[#142334]/70">{tool.body}</p>
                    </div>
                    <span className="mt-8 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-semibold text-[#142334]">
                      Open tool <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
