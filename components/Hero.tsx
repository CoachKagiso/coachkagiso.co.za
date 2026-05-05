'use client';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'motion/react';
import { FlowRibbon } from '@/components/DecorativeMotifs';

export default function Hero() {
  const { scrollY } = useScroll();
  const textY = useTransform(scrollY, [0, 1000], [0, 400]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative min-h-screen flex items-center overflow-hidden py-24"
    >
      {/* Huge background text for editorial feel */}
      <motion.div
        style={{ y: textY }}
        className="absolute top-0 left-0 w-full overflow-hidden pointer-events-none select-none opacity-10 flex justify-center -translate-y-12 z-0"
      >
        <span className="font-serif text-[180px] lg:text-[300px] leading-none whitespace-nowrap tracking-tight text-[#C9AD98] font-bold">
          ELEVATE
        </span>
      </motion.div>

      <FlowRibbon className="absolute top-[-16%] right-[-12%] h-[760px] w-[58%] opacity-25 pointer-events-none text-[#C9AD98] z-0" />

      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <div className="lg:col-span-7 relative z-20 xl:-mr-12 max-w-4xl -translate-x-[5%]">
            <p className="font-semibold tracking-[0.25em] text-[#C9AD98] text-[11px] mb-6 uppercase inline-block px-4 py-1 border border-[#C9AD98]/40 rounded-full">
              Career Development & Personal Brand Coach
            </p>
            <h1 className="font-serif text-[42px] md:text-[48px] lg:text-[76px] leading-[1.1] lg:leading-[68px] pl-0 ml-0 text-[#142334] font-bold tracking-tight">
              You did the work.<br />Why isn&apos;t anything moving?
            </h1>

            <div className="mt-8 bg-white/80 backdrop-blur-sm p-6 lg:p-8 border border-[#CDC6C3]/50 shadow-lg rounded-tl-[32px] rounded-br-[32px] max-w-[560px]">
              <p className="text-[17px] leading-relaxed text-[#142334]/80">
                You&apos;ve out-earned your graduate self. Or you&apos;re still waiting for the chance to prove you can. Promotion isn&apos;t coming because nobody is making it for you. That&apos;s not bad luck. That&apos;s how early to mid-career works in South Africa.
              </p>
            </div>

            <div className="mt-10 flex flex-col items-center sm:items-start gap-2">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <a href="#leadmagnet" className="inline-flex bg-[#C9AD98] text-[#142334] border border-[#C9AD98] font-semibold px-8 py-4 rounded-full hover:bg-transparent hover:-translate-y-1 hover:shadow-xl transition-all duration-300 shadow-md justify-center items-center tracking-wide text-[13px] whitespace-nowrap uppercase">
                  Take the 5-minute audit &rarr;
                </a>
                <a href="#services" className="inline-flex items-center font-medium text-[#142334] relative group whitespace-nowrap mt-2 sm:mt-0 uppercase text-[13px]">
                  See 1-on-1 services &rarr;
                  <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#C9AD98] transition-all duration-300 group-hover:w-full"></span>
                </a>
              </div>
              <span className="text-[13px] text-[#A09086] font-normal sm:pl-[22px] mt-1">
                Free, by email, in under 2 minutes
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 w-full relative z-10 pt-12 lg:pt-0 translate-x-[7%]">
            {/* Offset border box for an overlapping disruptive aesthetic */}
            <div className="absolute inset-0 border border-[#C9AD98] -translate-x-6 translate-y-6 lg:-translate-x-12 lg:translate-y-12 z-0"></div>

            <div className="aspect-[4/5] w-full bg-[#E8E3DF] shadow-2xl relative z-10">
              <Image
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop"
                alt="Professional Black woman coach"
                fill
                referrerPolicy="no-referrer"
                className="object-cover object-top"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
