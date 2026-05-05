'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { ArrowUpRight, Clock, Mail, MessageCircle } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import Navbar from '@/components/Navbar';
import ContactPageForm from '@/components/ContactPageForm';
import DiscoveryBooking from '@/components/DiscoveryBooking';
import DraggableCarousel from '@/components/DraggableCarousel';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import ParallaxWord from '@/components/ParallaxWord';
import { FlowRibbon, GeoArchPattern } from '@/components/DecorativeMotifs';

const contactRoutes = [
  {
    label: 'Email',
    value: 'hello@coachkagiso.co.za',
    href: 'mailto:hello@coachkagiso.co.za',
    icon: Mail,
  },
  {
    label: 'WhatsApp',
    value: '069 512 4398',
    href: 'https://wa.me/27695124398',
    icon: MessageCircle,
  },
];

const nextSteps = [
  {
    title: 'I read your message personally.',
    body: 'You are not going into a faceless inbox. I look at where you are, what you are asking for, and what kind of support makes sense.',
  },
  {
    title: 'You get a clear next step.',
    body: 'That may be a discovery call, a service recommendation, the free audit, or an honest note that I am not the right fit.',
  },
  {
    title: 'No pressure, no pitch.',
    body: 'The first conversation is about clarity. You do not need to decide anything before you are ready.',
  },
];

const faqs = [
  {
    q: 'I am not sure which package is right for me. Can you help?',
    a: 'Yes. That is exactly what the discovery call is for. You do not need to know the service before we talk.',
  },
  {
    q: 'What happens on a discovery call?',
    a: 'We talk about where you are, what feels stuck, what you want to change, and whether working together makes sense.',
  },
  {
    q: 'Do I have to sign up after the call?',
    a: 'No. If the fit is right, I will explain the options. If it is not, I will tell you honestly and point you somewhere useful.',
  },
  {
    q: 'Can I message on WhatsApp instead?',
    a: 'Yes. WhatsApp is often the fastest route, especially if you have a quick question before booking.',
  },
];

export default function ContactPage() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const contactX = useTransform(scrollYProgress, [0, 1], [0, 300]);

  return (
    <main className="font-sans bg-[#FCFBFA] text-[#142334] min-h-screen overflow-hidden">
      <Navbar />

      <section ref={sectionRef} className="relative pt-[120px] pb-16 lg:pb-24 bg-[#E4D8CB] overflow-hidden">
        <div className="absolute inset-x-0 top-20 pointer-events-none select-none text-center">
          <motion.div style={{ x: contactX }}>
            <span className="font-serif text-[18vw] leading-none text-white/35 tracking-normal">CONTACT</span>
          </motion.div>
        </div>
        <FlowRibbon className="absolute -right-28 top-4 h-[700px] w-[520px] opacity-[0.18] text-[#142334] pointer-events-none" />

        <div className="relative z-10 max-w-[1240px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.85fr_1fr] gap-12 lg:gap-16 items-end">
            <Reveal direction="right">
              <p className="inline-block border border-[#142334]/25 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.25em] uppercase text-[#142334]/70">
                Contact Coach Kagiso
              </p>
              <h1 className="mt-6 font-serif font-medium text-[54px] md:text-[86px] leading-[0.94] text-[#142334]">
                Let&apos;s talk about the move you are trying to make.
              </h1>
            </Reveal>

            <Reveal direction="left" delay={0.12}>
              <p className="max-w-xl text-[18px] leading-relaxed text-[#142334]/78">
                Reaching out can feel like a big step. It is just a conversation. No pressure, no performance, no need to have it all figured out before you start.
              </p>
              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                {contactRoutes.map((route) => {
                  const Icon = route.icon;
                  return (
                    <a key={route.label} href={route.href} className="group bg-white/65 border border-white p-5 flex items-center justify-between gap-4 hover:bg-white transition">
                      <span className="flex items-center gap-4">
                        <span className="h-11 w-11 rounded-full bg-[#142334] text-white flex items-center justify-center group-hover:bg-[#C9AD98] group-hover:text-[#142334] transition">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-[11px] uppercase tracking-[0.2em] font-semibold text-[#A09086]">{route.label}</span>
                          <span className="mt-1 block text-[14px] font-semibold text-[#142334]">{route.value}</span>
                        </span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-[#C9AD98] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </a>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <DraggableCarousel />

      <section className="relative py-20 lg:py-28 bg-[#FCFBFA]">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.74fr_1fr] gap-12 lg:gap-20 items-start">
            <Reveal direction="right" className="lg:sticky lg:top-28">
              <p className="inline-block border border-[#C9AD98]/60 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.25em] uppercase text-[#C9AD98]">
                Start here
              </p>
              <h2 className="mt-6 font-serif font-medium text-[42px] md:text-[62px] leading-tight">
                Choose the path that feels easiest.
              </h2>
              <p className="mt-6 text-[17px] leading-relaxed text-[#142334]/75 max-w-md">
                You can book a call, send a message, or use WhatsApp if that feels more natural. Either way, you will get a clear next step.
              </p>

              <DiscoveryBooking />
            </Reveal>

            <Reveal direction="left" delay={0.1}>
              <div className="relative">
                <div className="absolute -left-5 -bottom-5 h-full w-full border border-[#C9AD98]/60"></div>
                <div className="relative bg-white p-6 md:p-8 lg:p-10 border border-[#CDC6C3] shadow-2xl">
                  <ContactPageForm />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="relative py-20 lg:py-28 bg-white overflow-hidden">
        <GeoArchPattern className="absolute -right-24 top-0 h-[420px] w-[520px] opacity-[0.12] text-[#142334] pointer-events-none" />
        <div className="relative z-10 max-w-[1240px] mx-auto px-6 lg:px-8">
          <Reveal className="max-w-2xl mb-14">
            <p className="inline-block border border-[#C9AD98]/60 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.22em] uppercase text-[#C9AD98]">What happens next</p>
            <h2 className="mt-4 font-serif text-[42px] md:text-[58px] leading-tight">
              A simple process, because stuck already feels heavy enough.
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 border-y border-[#142334]/15">
            {nextSteps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.08} className="py-10 md:p-8 md:border-r md:last:border-r-0 border-[#142334]/15">
                <span className="font-display text-[54px] leading-none text-[#C9AD98]/75">0{index + 1}</span>
                <h3 className="mt-6 font-serif text-[29px] leading-tight">{step.title}</h3>
                <p className="mt-5 text-[16px] leading-relaxed text-[#142334]/72">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20 lg:py-28 bg-[#FCFBFA] overflow-hidden">
        <ParallaxWord
          distance={280}
          className="absolute left-[6%] bottom-[6%] z-0 pointer-events-none select-none font-serif text-[clamp(150px,24vw,360px)] leading-none text-[#E4D8CB]/55 tracking-normal"
        >
          FAQ
        </ParallaxWord>
        <div className="max-w-[1120px] mx-auto px-6 lg:px-8">
          <div className="relative z-10 grid lg:grid-cols-[0.75fr_1fr] gap-12 lg:gap-16 items-start">
            <Reveal direction="right">
              <p className="inline-block border border-[#C9AD98]/60 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.25em] uppercase text-[#C9AD98]">
                FAQ
              </p>
              <h2 className="mt-6 font-serif text-[42px] md:text-[56px] leading-tight">
                Still thinking about it?
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-[#142334]/75">
                It is normal to hesitate before reaching out. These are the questions most people ask before they book.
              </p>
            </Reveal>

            <div className="border-t border-[#142334]/15">
              {faqs.map((faq, index) => (
                <Reveal key={faq.q} delay={index * 0.05}>
                  <details className="group border-b border-[#142334]/15 [&_summary::-webkit-details-marker]:hidden" open={index === 0}>
                    <summary className="grid grid-cols-[auto_1fr] gap-5 py-6 cursor-pointer">
                      <span className="font-display text-[28px] text-[#C9AD98]">0{index + 1}</span>
                      <span>
                        <span className="block font-serif text-[24px] leading-tight text-[#142334]">{faq.q}</span>
                        <span className="block pt-4 text-[16px] leading-relaxed text-[#142334]/72 group-open:block">{faq.a}</span>
                      </span>
                    </summary>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#E4D8CB] text-center">
        <Reveal className="max-w-3xl mx-auto px-6">
          <Clock className="mx-auto h-8 w-8 text-[#142334]/55" />
          <h2 className="mt-6 font-serif text-[38px] md:text-[52px] leading-tight">
            Your career matters. Let&apos;s talk.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-[#142334]/72">
            You do not have to keep trying to figure this out alone.
          </p>
          <Link href="/#leadmagnet" className="mt-8 inline-flex rounded-full border border-[#142334]/25 px-8 py-3.5 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#142334] hover:text-[#E4D8CB] transition">
            Not ready? Take the audit
          </Link>
        </Reveal>
      </section>

      <Footer />
    </main>
  );
}
