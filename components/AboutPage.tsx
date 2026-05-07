'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import DraggableCarousel from '@/components/DraggableCarousel';

const beliefs = [
  {
    title: 'Hard work alone is not enough.',
    body: 'You can be talented, consistent, and still invisible to the people making decisions. The work has to be seen.',
    hover: { x: -14, y: 0 },
  },
  {
    title: 'Talent without visibility is private potential.',
    body: 'Your next move needs the right conversations, the right skills, and a clearer way of presenting who you are becoming.',
    hover: { x: 0, y: -14 },
  },
  {
    title: 'Your career does not exist in a vacuum.',
    body: 'Confidence, energy, time, faith, family, and strategy all shape how you move. Coaching has to look at the whole person.',
    hover: { x: 14, y: 0 },
  },
];

const methods = [
  'Clarify the person you want people to see when your name comes up.',
  'Audit your CV, LinkedIn, skills, visibility, confidence, and career patterns.',
  'Build a practical six or twelve month development plan with homework.',
  'Map affordable or free short courses that close the gaps for your next role.',
];

export default function AboutPage() {
  const shiftSectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll();
  const { scrollYProgress: shiftScrollYProgress } = useScroll({
    target: shiftSectionRef,
    offset: ['start end', 'end start'],
  });
  const heroTextY = useTransform(scrollYProgress, [0, 0.35], [0, 160]);
  const portraitY = useTransform(scrollYProgress, [0, 0.45], [0, -70]);
  const shiftBackgroundY = useTransform(shiftScrollYProgress, [0, 1], ['-8%', '8%']);

  return (
    <main className="font-sans bg-[#FCFBFA] text-[#142334] overflow-hidden">
      <section className="relative min-h-[100svh] pt-[72px] flex items-center bg-[#ECE7E1]">
        <motion.div
          style={{ y: heroTextY }}
          className="absolute inset-x-0 top-[80px] text-center pointer-events-none select-none"
        >
          <span className="font-serif text-[24vw] md:text-[18vw] leading-none text-white/70 tracking-normal">
            ABOUT
          </span>
        </motion.div>

        <div className="absolute inset-0 opacity-[0.08]">
          <svg viewBox="0 0 1200 900" className="h-full w-full" fill="none">
            <path d="M-40 240 C 220 40, 460 410, 740 170 C 940 0, 1090 110, 1250 10" stroke="#142334" strokeWidth="1" />
            <path d="M-20 390 C 190 210, 500 520, 760 300 C 980 115, 1100 240, 1260 130" stroke="#142334" strokeWidth="1" />
            <path d="M-70 545 C 230 340, 470 710, 820 450 C 1010 310, 1120 405, 1270 310" stroke="#142334" strokeWidth="1" />
          </svg>
        </div>

        <div className="relative z-10 max-w-[1240px] mx-auto px-6 lg:px-8 py-20 lg:py-28 w-full">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-6 items-end">
            <div className="lg:col-span-5 lg:pb-20">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="inline-block border border-[#C9AD98]/40 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.25em] uppercase text-[#C9AD98]"
              >
                About Kagiso
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="mt-6 font-serif font-medium text-[48px] md:text-[76px] lg:text-[92px] leading-[0.95] tracking-normal"
              >
                I help people get unstuck.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="mt-8 max-w-[530px] text-[18px] leading-relaxed text-[#142334]/80"
              >
                I grew up in Soweto having to figure out a lot by myself. That became the foundation of my work: nobody should have to build a career, a voice, and a way into the right rooms alone.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="mt-10 flex flex-col sm:flex-row gap-4"
              >
                <Link href="/contact" className="inline-flex justify-center rounded-full bg-[#142334] text-white px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.15em] hover:bg-[#C9AD98] hover:text-[#142334] hover:-translate-y-1 transition-all duration-300 whitespace-nowrap">
                  Start a conversation
                </Link>
                <Link href="#story" className="inline-flex justify-center rounded-full border border-[#142334]/25 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.15em] hover:border-[#142334] hover:-translate-y-1 transition-all duration-300 whitespace-nowrap">
                  Read the story
                </Link>
              </motion.div>
            </div>

            <motion.div style={{ y: portraitY }} className="lg:col-span-5 lg:col-start-7 relative">
              <div className="absolute -left-6 -bottom-6 w-full h-full border border-[#C9AD98]"></div>
              <div className="relative aspect-[4/5] bg-[#D8CEC6] shadow-2xl overflow-hidden">
                <Image
                  src="/images/about/about-hero-portrait.png"
                  alt="Portrait of Coach Kagiso smiling in a bright studio setting"
                  fill
                  priority
                  className="object-cover object-top"
                />
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      <section id="story" className="bg-white py-24 lg:py-36">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-4">
              <p className="inline-block border border-[#C9AD98]/40 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.25em] uppercase text-[#C9AD98]">Where I come from</p>
              <h2 className="mt-4 font-serif font-medium text-[38px] md:text-[54px] leading-tight">
                Soweto taught me to notice the doors nobody explained.
              </h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6 grid md:grid-cols-2 gap-10">
              <div className="space-y-6 text-[17px] leading-relaxed text-[#142334]/78">
                <p>
                  I grew up on the dusty streets of Deepkloof and Zola. I did not grow up with a clear path, strong networks, or a script for how to be seen.
                </p>
                <p>
                  For a long time, that felt like a disadvantage. I only started figuring it out in my thirties: how to build real connections, how to have the right conversations, and how to stop waiting for someone to notice me.
                </p>
              </div>
              <div className="relative min-h-[360px]">
                <div className="absolute right-0 top-0 w-[78%] aspect-[4/5] overflow-hidden bg-[#E8E3DF]">
                  <Image
                    src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=900&auto=format&fit=crop"
                    alt="People working together at a table"
                    fill
                    referrerPolicy="no-referrer"
                    className="object-cover"
                  />
                </div>
                <div className="absolute left-0 bottom-0 bg-[#142334] text-white w-[74%] p-8">
                  <p className="font-serif text-[24px] leading-snug">
                    Nobody should have to figure this out alone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={shiftSectionRef} className="relative bg-[#142334] text-white py-24 lg:py-36 overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-full lg:w-1/2 overflow-hidden opacity-44">
          <motion.div style={{ y: shiftBackgroundY }} className="absolute -inset-y-[10%] inset-x-0">
            <Image
              src="/images/about/about-shift-background.png"
              alt="Coach Kagiso working at a laptop in a bright office"
              fill
              className="object-cover"
            />
          </motion.div>
        </div>
        <div className="absolute inset-0 bg-[#142334]/52"></div>
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <p className="inline-block border border-[#C9AD98]/40 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.25em] uppercase text-[#C9AD98]">The shift</p>
              <h2 className="mt-4 font-serif font-medium text-[42px] md:text-[64px] leading-tight">
                Six doors closed. The seventh one taught me the rules.
              </h2>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <div className="bg-[#FCFBFA] text-[#142334] p-8 md:p-12 shadow-2xl">
                <p className="font-serif text-[28px] md:text-[36px] leading-tight">
                  I was good at leadership. But being good at the work was not enough.
                </p>
                <div className="mt-8 space-y-5 text-[16px] leading-relaxed text-[#142334]/78">
                  <p>
                    Every time I applied for a leadership role, the door closed. Not once. Six times. I was capable, but I did not know what skills were missing or who to ask.
                  </p>
                  <p>
                    The seventh time, I moved differently. I stopped applying blindly, spoke to the right people, asked what I was not seeing, and got the role.
                  </p>
                  <p>
                    I promised myself that once I understood how the game actually worked, I would teach it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#FCFBFA] py-24 lg:py-32">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="inline-block border border-[#C9AD98]/40 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.25em] uppercase text-[#C9AD98]">What I believe</p>
            <h2 className="mt-4 font-serif font-medium text-[40px] md:text-[58px] leading-tight">
              The problem is not your talent.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-0 border-y border-[#142334]/15">
            {beliefs.map((belief, index) => (
              <motion.div
                key={belief.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={belief.hover}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.08, ease: 'easeOut' }}
                className="py-10 md:py-14 md:px-8 border-b md:border-b-0 md:border-r last:border-r-0 border-[#142334]/15 will-change-transform"
              >
                <span className="font-display text-[54px] text-[#C9AD98] leading-none">0{index + 1}</span>
                <h3 className="mt-5 font-serif text-[28px] leading-tight">{belief.title}</h3>
                <p className="mt-5 text-[16px] leading-relaxed text-[#142334]/75">{belief.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24 lg:py-36">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            <div className="lg:col-span-5 order-2 lg:order-1">
              <div className="relative aspect-[4/5] bg-[#E4D8CB] overflow-hidden">
                <Image
                  src="/images/about/about-how-i-work.jpg"
                  alt="Coach Kagiso in a coaching conversation across a table"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="lg:col-span-6 lg:col-start-7 order-1 lg:order-2">
              <p className="inline-block border border-[#C9AD98]/40 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.25em] uppercase text-[#C9AD98]">How I work</p>
              <h2 className="mt-4 font-serif font-medium text-[40px] md:text-[58px] leading-tight">
                I start with the billboard question.
              </h2>
              <p className="mt-7 text-[18px] leading-relaxed text-[#142334]/80">
                Imagine your face on a freeway billboard with thousands of people driving past it every day. What do you want them to think? Who is that person?
              </p>
              <div className="mt-10 space-y-5">
                {methods.map((method, index) => (
                  <motion.div
                    key={method}
                    whileHover={{ x: 8 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-5 border-t border-[#CDC6C3]/70 pt-5"
                  >
                    <span className="font-display text-[24px] text-[#C9AD98] leading-none">{index + 1}</span>
                    <p className="text-[16px] leading-relaxed text-[#142334]/78">{method}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <DraggableCarousel />

      <section className="bg-[#E4D8CB] py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute -right-24 top-10 w-[420px] h-[420px] opacity-20 text-[#142334]">
          <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
            <path d="M10 120 C 40 20, 150 20, 185 105 C 160 185, 50 190, 10 120Z" stroke="currentColor" strokeWidth="0.6" />
            <path d="M30 118 C 52 45, 138 42, 165 104 C 143 162, 62 166, 30 118Z" stroke="currentColor" strokeWidth="0.6" />
            <path d="M52 114 C 68 66, 124 64, 144 102 C 126 139, 76 143, 52 114Z" stroke="currentColor" strokeWidth="0.6" />
          </svg>
        </div>
        <div className="relative z-10 max-w-[1000px] mx-auto px-6 lg:px-8 text-center">
          <p className="inline-block border border-[#C9AD98]/40 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.25em] uppercase text-[#C9AD98]">What keeps me grounded</p>
          <h2 className="mt-5 font-serif font-medium text-[40px] md:text-[62px] leading-tight">
            This is the work I needed when I was younger and could not find it.
          </h2>
          <div className="mt-8 max-w-3xl mx-auto space-y-5 text-[17px] leading-relaxed text-[#142334]/78">
            <p>
              I am a mom to a fourteen-year-old. He is the reason I want to build something meaningful, something that outlasts me.
            </p>
            <p>
              My faith keeps me grounded. Real growth comes from serving others and giving back what you have been given. That conviction fuels this practice more than anything else.
            </p>
          </div>
          <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/book/discovery" className="inline-flex justify-center rounded-full bg-[#142334] text-white px-9 py-4 text-[13px] font-semibold uppercase tracking-[0.18em] hover:bg-white hover:text-[#142334] hover:-translate-y-1 transition-all duration-300">
              Book a discovery call
            </Link>
            <Link href="/#leadmagnet" className="inline-flex justify-center rounded-full border border-[#142334]/30 px-9 py-4 text-[13px] font-semibold uppercase tracking-[0.18em] hover:border-[#142334] hover:-translate-y-1 transition-all duration-300">
              Take the free audit
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
