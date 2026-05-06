'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import Link from 'next/link';
import Reveal from '@/components/Reveal';

const audiences = [
  {
    title: 'Past entry-level, stuck in the same role',
    body: 'You have put in the years. You are earning more than you did as a grad, but the title has not moved. The problem is not your work. It is that your work is not visible to the people who decide.',
    hover: { x: -14, y: 0 },
  },
  {
    title: 'Qualified, but cannot find a way in',
    body: 'You have the degree and the grades, but your applications keep disappearing. You need a CV that actually gets opened and a way into rooms you did not know existed.',
    hover: { x: 0, y: -14 },
  },
  {
    title: 'Ready to pivot, not start over',
    body: 'You are done with your industry, but you are not trying to start again at the bottom. You need a bridge from where you are to where you are going.',
    hover: { x: 14, y: 0 },
  },
];

export default function WhoIWorkWith() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const workX = useTransform(scrollYProgress, [0, 1], [0, -350]);

  return (
    <section ref={sectionRef} id="work-with-me" className="py-24 lg:py-32 bg-[#FCFBFA] border-b border-[#CDC6C3]/50 relative z-10 overflow-hidden">
      <motion.div
        style={{ x: workX }}
        className="absolute inset-x-0 top-10 text-center pointer-events-none select-none"
      >
        <span className="font-serif text-[15vw] leading-none text-[#E4D8CB]/45 tracking-normal">WORK</span>
      </motion.div>

      <div className="max-w-[1240px] mx-auto px-6 lg:px-8 relative z-10">
        <Reveal className="text-center mb-20 px-4" direction="up">
          <p className="font-sans font-semibold text-[12px] tracking-[0.2em] uppercase text-[#C9AD98] mb-4 inline-block px-4 py-1 border border-[#C9AD98]/60 rounded-full">
            Who I work with
          </p>
          <h2 className="font-serif font-medium text-[42px] md:text-[58px] text-[#142334] mb-6 leading-tight max-w-4xl w-full mx-auto">
            Career coaching for the moment you are actually in.
          </h2>
          <p className="font-sans font-normal text-[17px] text-[#142334]/76 max-w-3xl mx-auto leading-relaxed">
            Whether you are stuck, searching, or ready to pivot, there is a place for you here.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-0 relative border-y border-[#142334]/15">
          {audiences.map((audience, index) => (
            <motion.div
              key={audience.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={audience.hover}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.09, ease: 'easeOut' }}
              className={`relative py-12 md:py-14 md:px-8 will-change-transform ${
                index === 1 ? 'border-y md:border-y-0 md:border-x border-[#142334]/15' : ''
              }`}
            >
              <span className="font-display text-[54px] leading-none text-[#C9AD98]/70">0{index + 1}</span>
              <h3 className="mt-6 font-serif font-medium text-[29px] text-[#142334] leading-[1.12]">
                {audience.title}
              </h3>
              <p className="mt-6 font-sans text-[16.5px] text-[#142334]/76 leading-relaxed font-normal">
                {audience.body}
              </p>
            </motion.div>
          ))}
        </div>

        <Reveal className="mt-16 text-center" delay={0.15}>
          <p className="text-[14px] text-[#A09086] font-medium">
            Whichever one of these you are, the audit is the place to start.{' '}
            <Link href="/#leadmagnet" className="text-[#142334] hover:underline hover:decoration-[#C9AD98] hover:decoration-2 hover:underline-offset-4 transition-all inline-flex items-center group">
              Take 5 minutes
              <span className="inline-block ml-1 group-hover:translate-x-1 transition-transform">&rarr;</span>
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
