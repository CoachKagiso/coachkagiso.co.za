'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { ContourField, FloralMark } from '@/components/DecorativeMotifs';

const aboutSignals = ['Visibility', 'Career clarity', 'Personal brand'];

export default function About() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ['-15%', '15%']);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1 }}
      id="about"
      className="py-48 lg:py-64 bg-white relative z-10"
    >
      <div className="max-w-[1200px] mx-auto px-0 lg:px-8 relative">
        <div className="absolute top-[18%] lg:top-0 bottom-0 lg:-bottom-20 left-0 right-0 lg:left-[25%] bg-[#142334] z-0 overflow-hidden">
          <ContourField className="absolute top-[-18%] right-[-18%] h-[130%] w-[78%] opacity-[0.12] pointer-events-none text-[#C9AD98]" />
        </div>

        <FloralMark className="absolute top-[8%] right-8 hidden lg:block h-24 w-24 text-[#C9AD98]/35 pointer-events-none z-10" />

        <div className="grid lg:grid-cols-12 gap-0 relative z-10 w-full h-full px-6 lg:px-0">
          <div
            ref={containerRef}
            className="col-span-1 lg:col-span-5 relative w-full aspect-[4/5] lg:aspect-[3/4] shadow-2xl z-20 lg:translate-y-56 lg:-translate-x-8 overflow-hidden bg-[#142334]"
          >
            <motion.div style={{ y: imageY }} className="absolute -inset-[20%] w-[140%] h-[140%]">
              <Image
                src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=800&auto=format&fit=crop"
                alt="Coach Kagiso portrait"
                fill
                referrerPolicy="no-referrer"
                className="object-cover object-top"
              />
            </motion.div>
          </div>

          <div className="col-span-1 lg:col-span-7 flex flex-col justify-center relative z-30 lg:pl-16 mt-12 lg:mt-0 pb-16 lg:pb-0">
            <div className="bg-[#F4EFE9] text-[#142334] p-7 lg:p-10 mb-12 -mx-4 lg:-mt-24 lg:mr-0 lg:ml-auto lg:w-[85%] relative border border-[#C9AD98]/35 shadow-xl">
              <FloralMark className="absolute -right-6 -top-7 h-16 w-16 text-[#C9AD98]/45 pointer-events-none" />
              <p className="font-serif text-[21px] lg:text-[27px] leading-snug italic pr-4">
                &quot;As soon as you feel that you&apos;re comfortable in a space, that&apos;s the most dangerous and riskiest place that you can be.&quot;
              </p>
              <p className="mt-7 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#A09086]">Coach Kagiso</p>
            </div>

            <div className="pr-0 lg:pr-12 text-white">
              <p className="text-[#C9AD98] text-[12px] font-semibold tracking-[0.25em] uppercase mb-5 inline-block px-4 py-1 border border-[#C9AD98]/60 rounded-full">
                About Coach Kagiso
              </p>
              <h2 className="font-serif text-[42px] lg:text-[56px] leading-[1.1] mb-8 font-medium">
                The short version: I know what invisible potential feels like.
              </h2>

              <div className="space-y-6 text-white/78 text-[17px] leading-relaxed font-light">
                <p>
                  I am a Career Development and Personal Brand Coach. My clients are usually past entry-level, employed, capable, and quietly losing patience with their own trajectory.
                </p>
                <p>
                  I learned something useful from my own career: doing good work does not automatically move you. The people who get considered are usually the ones whose work is visible to people who can do something about it.
                </p>
                <p>
                  That is the work I do with private clients. We clean up the story, close the gaps, and build a plan that helps you move with intention instead of waiting to be noticed.
                </p>
              </div>

              <div className="mt-9 grid sm:grid-cols-3 border-y border-white/12">
                {aboutSignals.map((signal) => (
                  <div key={signal} className="py-4 sm:px-4 sm:first:pl-0 sm:border-r sm:last:border-r-0 border-white/12">
                    <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[#C9AD98]">{signal}</p>
                  </div>
                ))}
              </div>

              <div className="mt-12 flex flex-col items-start sm:items-end">
                <span className="font-signature text-[48px] text-[#C9AD98]">Coach Kagiso</span>
                <Link
                  href="/about"
                  className="mt-4 inline-flex items-center font-semibold text-white relative group text-[13px] uppercase tracking-[0.16em]"
                >
                  Read the full story &rarr;
                  <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#C9AD98] transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
