'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';

const serviceOptions = [
  '48-Hour CV Review',
  'CV Revamp',
  'Cover Letter',
  'LinkedIn Optimisation',
  'CV + LinkedIn Bundle',
  'Career Clarity Session',
  'Glow Up VIP Package',
  'Saturday Masterclass',
  'Personal Brand Audit or free resource',
  'I am not sure yet',
  'Something else',
];

export default function ContactPageForm() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-[480px] flex flex-col justify-center">
        <div className="h-16 w-16 bg-[#C9AD98]/20 text-[#142334] rounded-full flex items-center justify-center mb-7">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
          Message received
        </p>
        <h3 className="mt-4 font-serif font-medium text-[34px] leading-tight text-[#142334]">
          Thank you. I&apos;ll reply within 24 hours.
        </h3>
        <p className="mt-5 max-w-md text-[16px] leading-relaxed text-[#142334]/72">
          While you wait, the Personal Brand Audit is a useful place to start. It takes five minutes and gives you a quick read on your visibility gaps.
        </p>
        <Link
          href="/#leadmagnet"
          className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-[#142334] text-white px-7 py-3.5 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#C9AD98] hover:text-[#142334] transition"
        >
          Take the audit <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
          Send a note
        </p>
        <h2 className="mt-3 font-serif text-[34px] leading-tight text-[#142334]">
          Tell me what is happening in your career.
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label htmlFor="name" className="text-[12px] font-semibold text-[#142334] uppercase tracking-[0.18em]">
            Name <span className="text-[#C9AD98]">*</span>
          </label>
          <input
            required
            type="text"
            id="name"
            name="name"
            maxLength={80}
            pattern="^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$"
            title="Please use letters only. Spaces, apostrophes, and hyphens are allowed."
            autoComplete="name"
            className="w-full border border-[#CDC6C3] bg-[#FCFBFA] px-4 py-3.5 outline-none transition focus:border-[#142334]"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-[12px] font-semibold text-[#142334] uppercase tracking-[0.18em]">
            Email <span className="text-[#C9AD98]">*</span>
          </label>
          <input
            required
            type="email"
            id="email"
            name="email"
            maxLength={120}
            autoComplete="email"
            className="w-full border border-[#CDC6C3] bg-[#FCFBFA] px-4 py-3.5 outline-none transition focus:border-[#142334]"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label htmlFor="phone" className="text-[12px] font-semibold text-[#142334] uppercase tracking-[0.18em]">
            WhatsApp number
          </label>
          <input
            type="tel"
            id="phone"
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
          <label htmlFor="reply-method" className="text-[12px] font-semibold text-[#142334] uppercase tracking-[0.18em]">
            Best way to reply <span className="text-[#C9AD98]">*</span>
          </label>
          <select required id="reply-method" name="reply-method" className="w-full border border-[#CDC6C3] bg-[#FCFBFA] px-4 py-3.5 outline-none transition focus:border-[#142334]">
            <option value="">Choose one</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="either">Either is fine</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label htmlFor="service" className="text-[12px] font-semibold text-[#142334] uppercase tracking-[0.18em]">
            What are you asking about? <span className="text-[#C9AD98]">*</span>
          </label>
          <select required id="service" name="service" className="w-full border border-[#CDC6C3] bg-[#FCFBFA] px-4 py-3.5 outline-none transition focus:border-[#142334]">
            <option value="">Choose one</option>
            {serviceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="timeline" className="text-[12px] font-semibold text-[#142334] uppercase tracking-[0.18em]">
            Timeline <span className="text-[#C9AD98]">*</span>
          </label>
          <select required id="timeline" name="timeline" className="w-full border border-[#CDC6C3] bg-[#FCFBFA] px-4 py-3.5 outline-none transition focus:border-[#142334]">
            <option value="">Choose one</option>
            <option value="urgent">Urgent, within 48 hours</option>
            <option value="this-week">This week</option>
            <option value="this-month">This month</option>
            <option value="exploring">Just exploring for now</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="career-stage" className="text-[12px] font-semibold text-[#142334] uppercase tracking-[0.18em]">
          Where are you right now? <span className="text-[#C9AD98]">*</span>
        </label>
        <select required id="career-stage" name="career-stage" className="w-full border border-[#CDC6C3] bg-[#FCFBFA] px-4 py-3.5 outline-none transition focus:border-[#142334]">
          <option value="">Choose one</option>
          <option value="graduate">Graduate or job seeker</option>
          <option value="employed">Employed and looking for growth</option>
          <option value="pivot">Considering a career pivot</option>
          <option value="new-role">Preparing for a new role</option>
          <option value="leadership">Stepping into leadership</option>
          <option value="not-sure">I am not sure how to describe it</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="message" className="text-[12px] font-semibold text-[#142334] uppercase tracking-[0.18em]">
          What should I know before I reply? <span className="text-[#C9AD98]">*</span>
        </label>
        <textarea
          required
          id="message"
          name="message"
          rows={5}
          maxLength={1200}
          placeholder="Tell me what you want help with, what role or goal is involved, and anything that feels time-sensitive."
          className="w-full resize-none border border-[#CDC6C3] bg-[#FCFBFA] px-4 py-3.5 outline-none transition focus:border-[#142334]"
        ></textarea>
      </div>

      <div className="flex items-start gap-3 border-t border-[#142334]/10 pt-5">
        <input required type="checkbox" id="popia" name="popia" className="mt-1 h-4 w-4 accent-[#142334]" />
        <label htmlFor="popia" className="text-[13px] text-[#142334]/72 leading-relaxed">
          I understand my information will only be used to respond to this enquiry.
        </label>
      </div>

      <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#142334] text-white font-semibold px-8 py-4 hover:bg-[#C9AD98] hover:text-[#142334] hover:-translate-y-1 transition-all duration-300">
        Send message <ArrowUpRight className="h-4 w-4" />
      </button>
    </form>
  );
}
