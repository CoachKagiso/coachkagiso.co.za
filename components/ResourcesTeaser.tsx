'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Clock } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import { insights } from '@/lib/insights';

export default function ResourcesTeaser() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const insightsX = useTransform(scrollYProgress, [0, 1], [0, 200]);

  const previewSlugs = [
    'first-time-manager-south-africa-first-30-days',
    'linkedin-profile-optimisation-south-africa-2026',
    'ats-cv-south-africa-4-minute-fix',
  ];
  const articles = previewSlugs
    .map((slug) => insights.find((article) => article.slug === slug))
    .filter((article): article is NonNullable<typeof article> => Boolean(article));

  return (
    <motion.section
      ref={sectionRef}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1 }}
      id="resources"
      className="py-24 lg:py-32 bg-[#FCFBFA] border-y border-[#142334]/10 relative z-10 overflow-hidden"
    >
      <motion.div
        style={{ x: insightsX }}
        className="absolute inset-x-0 top-8 pointer-events-none select-none text-center"
      >
        <span className="font-serif text-[18vw] leading-none text-[#E4D8CB]/30 tracking-normal uppercase">
          INSIGHTS
        </span>
      </motion.div>
      <div className="max-w-[1240px] mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-[0.75fr_1fr] gap-12 lg:gap-16 lg:items-end mb-16">
          <div className="max-w-xl">
            <p className="inline-block border border-[#C9AD98]/60 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.25em] uppercase text-[#C9AD98]">
              Learn with me
            </p>
            <h2 className="mt-5 font-serif font-medium text-[42px] md:text-[58px] leading-tight text-[#142334]">
              Career strategies for the work behind the work.
            </h2>
          </div>
          <div className="lg:justify-self-end max-w-md">
            <p className="text-[16px] leading-relaxed text-[#142334]/75">
              Practical field notes for visibility, CV strategy, career pivots, and the conversations that move your name into the right rooms.
            </p>
            <Link href="/insights" className="mt-7 inline-flex items-center text-[12px] uppercase tracking-[0.2em] font-semibold text-[#142334] relative group">
              View all insights <ArrowUpRight className="h-4 w-4" />
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#C9AD98] transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-x-8 gap-y-12">
          {articles.map((article, index) => (
            <motion.article
              key={article.slug}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: index * 0.08 }}
              className="group border-t border-[#142334]/15 pt-6"
            >
              <Link href={`/insights/${article.slug}`} className="block">
                <div className="aspect-[4/3] relative overflow-hidden bg-[#CDC6C3]">
                  <Image
                    src={article.image}
                    alt={article.imageAlt}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="pt-6">
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold tracking-[0.18em] uppercase text-[#A09086]">
                    <span>{article.category}</span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {article.readTime}
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif font-medium text-[26px] text-[#142334] leading-tight group-hover:text-[#C9AD98] transition">
                    {article.title}
                  </h3>
                  <p className="mt-4 text-[15px] leading-relaxed text-[#142334]/72">{article.dek}</p>
                  <div className="mt-6 inline-flex items-center text-[11px] uppercase tracking-[0.2em] font-semibold text-[#142334] relative group">
                    Read article <ArrowUpRight className="h-4 w-4" />
                    <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#C9AD98] transition-all duration-300 group-hover:w-full"></span>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
