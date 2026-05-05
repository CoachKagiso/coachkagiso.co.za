'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Mail, MessageCircle } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import { FlowRibbon, FloralMark } from '@/components/DecorativeMotifs';

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

const quickSupportOptions = [
  'CV Review or CV Revamp',
  'LinkedIn Optimisation',
  'CV + LinkedIn Bundle',
  'Career Clarity Session',
  'Glow Up VIP Package',
  'Saturday Masterclass',
  'Free audit or resources',
  'I am not sure yet',
];

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const contactY = useTransform(scrollYProgress, [0, 1], [0, 250]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // Replace with Zoho form endpoint when the production form is connected.
  };

  return (
    <motion.section
      ref={sectionRef}
      id="contact"
      className="relative z-10 overflow-hidden bg-[#FCFBFA] py-24 lg:py-32"
    >
      <div className="absolute inset-x-0 top-8 pointer-events-none select-none text-center">
        <motion.div style={{ y: contactY }}>
          <span className="font-serif text-[18vw] leading-none text-[#E4D8CB]/45 tracking-normal">
            CONTACT
          </span>
        </motion.div>
      </div>
      <FlowRibbon className="absolute -right-28 top-0 h-[680px] w-[520px] opacity-[0.16] text-[#C9AD98] pointer-events-none" />
      <FloralMark className="absolute left-8 bottom-10 hidden h-28 w-28 text-[#C9AD98]/30 lg:block pointer-events-none" />

      <div className="relative z-10 max-w-[1240px] mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-[0.82fr_1fr] gap-12 lg:gap-20 items-start">
          <div className="lg:sticky lg:top-28">
            <p className="inline-block border border-[#C9AD98]/60 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.25em] uppercase text-[#C9AD98]">
              Reach out
            </p>
            <h2 className="mt-6 font-serif font-medium text-[44px] md:text-[68px] leading-[0.98] text-[#142334]">
              Ready to map out your next career move?
            </h2>
            <p className="mt-7 max-w-[530px] text-[17px] leading-relaxed text-[#142334]/76">
              Use this quick form if you know enough to reach out. If your situation needs more context, the contact page has the fuller enquiry form.
            </p>

            <div className="mt-10 grid gap-4 border-y border-[#142334]/15 py-7">
              {contactRoutes.map((route) => {
                const Icon = route.icon;
                return (
                  <a
                    key={route.label}
                    href={route.href}
                    className="group flex items-center justify-between gap-5 text-[#142334]"
                  >
                    <span className="flex items-center gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#142334] text-white group-hover:bg-[#C9AD98] group-hover:text-[#142334] transition">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-[11px] uppercase tracking-[0.2em] font-semibold text-[#A09086]">
                          {route.label}
                        </span>
                        <span className="mt-1 block text-[15px] font-medium">{route.value}</span>
                      </span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-[#C9AD98] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </a>
                );
              })}
            </div>

            <p className="mt-7 max-w-sm text-[13px] leading-relaxed text-[#142334]/58">
              I usually reply within 24 hours on weekdays. If it is urgent, WhatsApp is the quickest route.
            </p>
            <Link href="/contact" className="mt-5 inline-flex text-[12px] uppercase tracking-[0.18em] font-semibold text-[#C9AD98] hover:text-[#142334] transition">
              Open the detailed contact form <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="relative">
            <div className="absolute -left-5 -bottom-5 h-full w-full border border-[#C9AD98]/60"></div>
            <div className="relative bg-white p-6 md:p-8 lg:p-10 border border-[#CDC6C3] shadow-2xl">
              {submitted ? (
                <div className="flex min-h-[470px] flex-col items-start justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C9AD98]/20 text-[#142334] mb-7">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
                    Message received
                  </p>
                  <h3 className="mt-4 font-serif font-medium text-[36px] leading-tight text-[#142334]">
                    Thank you. I&apos;ll reply within 24 hours.
                  </h3>
                  <p className="mt-5 max-w-md text-[16px] leading-relaxed text-[#142334]/72">
                    While you wait, the free audit is a good place to start if you want a quick read on where your visibility may be breaking down.
                  </p>
                  <Link
                    href="/#leadmagnet"
                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#142334] text-white px-7 py-3.5 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#C9AD98] hover:text-[#142334] transition"
                  >
                    Take the audit <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
                      Quick enquiry
                    </p>
                    <h3 className="mt-3 font-serif text-[32px] leading-tight text-[#142334]">
                      Send the short version.
                    </h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label htmlFor="quick-name" className="text-[12px] font-semibold text-[#142334] uppercase tracking-[0.18em]">
                        Name <span className="text-[#C9AD98]">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        id="quick-name"
                        name="name"
                        maxLength={80}
                        pattern="^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$"
                        title="Please use letters only. Spaces, apostrophes, and hyphens are allowed."
                        autoComplete="name"
                        className="w-full border border-[#CDC6C3] bg-[#FCFBFA] px-4 py-3.5 outline-none transition focus:border-[#142334]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="quick-email" className="text-[12px] font-semibold text-[#142334] uppercase tracking-[0.18em]">
                        Email <span className="text-[#C9AD98]">*</span>
                      </label>
                      <input
                        required
                        type="email"
                        id="quick-email"
                        name="email"
                        maxLength={120}
                        autoComplete="email"
                        className="w-full border border-[#CDC6C3] bg-[#FCFBFA] px-4 py-3.5 outline-none transition focus:border-[#142334]"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label htmlFor="quick-phone" className="text-[12px] font-semibold text-[#142334] uppercase tracking-[0.18em]">
                        WhatsApp number
                      </label>
                      <input
                        type="tel"
                        id="quick-phone"
                        name="phone"
                        maxLength={30}
                        pattern="^[0-9+() -]{7,30}$"
                        title="Please enter a valid phone number using numbers, spaces, +, brackets, or hyphens."
                        autoComplete="tel"
                        placeholder="Optional"
                        className="w-full border border-[#CDC6C3] bg-[#FCFBFA] px-4 py-3.5 outline-none transition focus:border-[#142334]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="quick-support" className="text-[12px] font-semibold text-[#142334] uppercase tracking-[0.18em]">
                        What do you need? <span className="text-[#C9AD98]">*</span>
                      </label>
                      <select
                        required
                        id="quick-support"
                        name="support"
                        className="w-full border border-[#CDC6C3] bg-[#FCFBFA] px-4 py-3.5 outline-none transition focus:border-[#142334]"
                      >
                        <option value="">Choose one</option>
                        {quickSupportOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="quick-message" className="text-[12px] font-semibold text-[#142334] uppercase tracking-[0.18em]">
                      Short note <span className="text-[#C9AD98]">*</span>
                    </label>
                    <textarea
                      required
                      id="quick-message"
                      name="message"
                      rows={4}
                      maxLength={700}
                      placeholder="One or two lines is enough. Tell me what you want help with."
                      className="w-full resize-none border border-[#CDC6C3] bg-[#FCFBFA] px-4 py-3.5 outline-none transition focus:border-[#142334]"
                    ></textarea>
                  </div>

                  <div className="flex items-start gap-3 border-t border-[#142334]/10 pt-5">
                    <input required type="checkbox" id="quick-popia" name="popia" className="mt-1 h-4 w-4 accent-[#142334]" />
                    <label htmlFor="quick-popia" className="text-[13px] text-[#142334]/72 leading-relaxed">
                      I understand my information will only be used to respond to this enquiry.
                    </label>
                  </div>

                  <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#142334] text-white font-semibold px-8 py-4 hover:bg-[#C9AD98] hover:text-[#142334] hover:-translate-y-1 transition-all duration-300">
                    Send message <ArrowUpRight className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
