'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import { GeoArchPattern } from '@/components/DecorativeMotifs';

const auditPoints = [
  '10 questions',
  'Career archetype',
  '7-day action',
  'Matched next step',
];

export default function LeadMagnet() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const auditX = useTransform(scrollYProgress, [0, 1], [0, 350]);

  return (
    <section ref={sectionRef} id="leadmagnet" className="relative z-10 overflow-hidden bg-[#E4D8CB] py-24 lg:py-32">
      <motion.div
        style={{ x: auditX }}
        className="absolute inset-x-0 top-8 pointer-events-none select-none text-center"
      >
        <span className="font-serif text-[18vw] leading-none text-white/30 tracking-normal">
          DIAGNOSTIC
        </span>
      </motion.div>
      <GeoArchPattern className="absolute -left-20 bottom-0 h-[460px] w-[520px] opacity-[0.18] text-[#142334] pointer-events-none" />

      <div className="relative z-10 max-w-[1240px] mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-[0.9fr_1fr] gap-12 lg:gap-20 items-center">
          <div className="relative">
            <div className="absolute -left-5 -bottom-5 h-full w-full border border-[#142334]/25" />
            <div className="relative bg-[#142334] text-white p-5 md:p-7 shadow-2xl">
              <div className="relative aspect-[4/3] overflow-hidden bg-[#CDC6C3]">
                <Image
                  src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=1000&auto=format&fit=crop"
                  alt="Career diagnostic worksheet on a desk"
                  fill
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              </div>
              <div className="grid sm:grid-cols-4 gap-4 border-t border-white/12 mt-6 pt-6">
                {auditPoints.map((point) => (
                  <div key={point} className="flex sm:flex-col gap-3 sm:gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#C9AD98] shrink-0 mt-0.5" />
                    <span className="text-[12px] leading-snug uppercase tracking-[0.12em] text-white/72">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="inline-block border border-[#142334]/25 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.25em] uppercase text-[#142334]/70">
              Free 5-minute diagnostic
            </p>
            <h2 className="mt-6 font-serif font-medium text-[44px] md:text-[68px] leading-[0.98] text-[#142334]">
              Find out which kind of stuck you are before you try to fix the wrong thing.
            </h2>
            <p className="mt-7 max-w-[620px] text-[18px] leading-relaxed text-[#142334]/78">
              Answer 10 focused questions and receive a career archetype, a 7-day action, and a next step that matches your current career season.
            </p>

            <div className="mt-9 border-y border-[#142334]/15 py-7">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Link href="/resources/career-diagnostic" className="inline-flex justify-center items-center gap-2 bg-[#142334] text-white font-semibold px-8 py-4 rounded-full hover:bg-white hover:text-[#142334] hover:-translate-y-1 transition-all duration-300">
                  Take the diagnostic <ArrowUpRight className="h-4 w-4" />
                </Link>
                <span className="text-[13px] leading-relaxed text-[#142334]/65">
                  Result shown instantly. PDF delivery can connect to Brevo when ready.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
