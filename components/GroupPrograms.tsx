'use client';

import Image from 'next/image';
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
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['-4%', '4%']);

  return (
    <section ref={sectionRef} className="relative z-10 min-h-[88vh] overflow-hidden bg-[#E8DDD1]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="sticky top-0 h-screen overflow-hidden">
          <motion.div style={{ y: backgroundY }} className="absolute inset-0 scale-[1.05]">
            <Image
              src="/images/masterclass-bg.jpg"
              alt="Elevate Saturday Masterclass set with branded backdrop and lounge chairs"
              fill
              priority={false}
              className="object-cover object-[center_20%]"
            />
          </motion.div>
          <div className="absolute inset-0 bg-[#EFE3D7]/82" />
          <motion.div style={{ x: parallaxX }} className="absolute -right-20 top-0 h-[420px] w-[520px] opacity-[0.08] text-[#142334]">
            <GeoArchPattern />
          </motion.div>
        </div>
      </div>
      <div className="relative z-10 max-w-[1100px] mx-auto px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-[0.8fr_1fr] gap-10 lg:gap-16 items-center min-h-[calc(88vh-10rem)]">
          <Reveal direction="right">
            <p className="inline-block border border-[#142334]/25 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.25em] uppercase text-[#142334]/65">
              Seasonal masterclass
            </p>
            <h2 className="mt-6 font-serif font-medium text-[42px] md:text-[60px] leading-tight text-[#142334]">
              Learn the career moves people usually find out too late.
            </h2>
          </Reveal>

          <Reveal direction="left" delay={0.12} className="bg-[#142334]/88 text-white p-7 md:p-9 shadow-2xl rounded-tl-[30px] rounded-br-[30px] backdrop-blur-[2px]">
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
                Reserve my seat <ArrowUpRight className="h-4 w-4" />
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
