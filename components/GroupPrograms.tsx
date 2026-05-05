'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import Reveal from '@/components/Reveal';
import { GeoArchPattern } from '@/components/DecorativeMotifs';

export default function GroupPrograms() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const parallaxX = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <section ref={sectionRef} className="relative z-10 overflow-hidden bg-[#E4D8CB] py-20 lg:py-28">
      <motion.div style={{ x: parallaxX }} className="absolute -right-20 top-0 h-[420px] w-[520px] opacity-[0.16] text-[#142334] pointer-events-none">
        <GeoArchPattern />
      </motion.div>
      <div className="relative z-10 max-w-[1100px] mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-[0.8fr_1fr] gap-10 lg:gap-16 items-center">
          <Reveal direction="right">
            <p className="inline-block border border-[#142334]/25 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.25em] uppercase text-[#142334]/65">
              Seasonal masterclass
            </p>
            <h2 className="mt-6 font-serif font-medium text-[42px] md:text-[60px] leading-tight text-[#142334]">
              Learn the career moves people usually find out too late.
            </h2>
          </Reveal>

          <Reveal direction="left" delay={0.12} className="bg-[#142334] text-white p-7 md:p-9 shadow-2xl rounded-tl-[30px] rounded-br-[30px]">
            <p className="text-[17px] leading-relaxed text-white/76">
              Masterclasses run seasonally for people who want focused support around visibility, CV positioning, interview confidence, and career pivots.
            </p>
            <div className="mt-8 grid sm:grid-cols-3 gap-5 border-y border-white/12 py-6">
              {['Live teaching', 'Practical pre-work', 'Early access'].map((item) => (
                <div key={item}>
                  <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[#C9AD98]">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-8">
              <Link href="/book/masterclass" className="inline-flex items-center gap-2 rounded-full bg-[#C9AD98] text-[#142334] px-7 py-3.5 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-white hover:-translate-y-1 transition-all duration-300">
                Hold my spot <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href="/about" className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] font-semibold text-white/70 relative group">
                Learn more <ArrowUpRight className="h-4 w-4" />
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#C9AD98] transition-all duration-300 group-hover:w-full"></span>
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
