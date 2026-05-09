import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Facebook, Linkedin, Mail, MessageCircle } from 'lucide-react';
import { ContourField } from '@/components/DecorativeMotifs';

const navigation = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Work With Me', href: '/work-with-me' },
  { label: 'Insights', href: '/insights' },
  { label: 'Resources', href: '/resources' },
  { label: 'Contact', href: '/contact' },
];

const services = [
  'CV strategy',
  'Personal brand audit',
  'Career clarity',
  'Interview preparation',
  'Leadership visibility',
];

export default function Footer() {
  return (
    <footer className="relative z-10 overflow-hidden bg-[#142334] text-white">
      <style>{`
        @keyframes coach-kagiso-footer-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .coach-kagiso-footer-marquee {
          animation: coach-kagiso-footer-marquee 55s linear infinite;
        }
      `}</style>
      <div className="absolute inset-x-0 top-8 pointer-events-none select-none overflow-hidden">
        <div className="coach-kagiso-footer-marquee flex w-max whitespace-nowrap">
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={index} className="font-serif text-[18vw] leading-none text-white/[0.035] tracking-normal px-10 uppercase">
              Coach Kagiso
            </span>
          ))}
        </div>
      </div>
      <ContourField className="absolute -right-28 top-20 h-[520px] w-[520px] opacity-[0.16] text-[#C9AD98] pointer-events-none" />

      <div className="relative z-10 max-w-[1240px] mx-auto px-6 lg:px-8 pt-24 lg:pt-32 pb-10">
        <div className="grid lg:grid-cols-[1fr_0.85fr] gap-14 lg:gap-20 pb-16 border-b border-white/12">
          <div>
            <p className="inline-block border border-[#C9AD98]/50 px-4 py-1 rounded-full text-[11px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
              Ready when you are
            </p>
            <h2 className="mt-6 max-w-3xl font-serif font-medium text-[44px] md:text-[72px] leading-[0.98]">
              Your career does not need more waiting.
            </h2>
            <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-white/72">
              Start with a conversation, the free diagnostic, or the latest insights. Wherever you begin, the goal is the same: show up, stand out, and move with intention.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/book/discovery"
                className="inline-flex justify-center rounded-full bg-[#C9AD98] text-[#142334] px-8 py-4 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-white hover:-translate-y-1 transition-all duration-300"
              >
                Book a discovery call
              </Link>
              <Link
                href="/resources/career-diagnostic"
                className="inline-flex justify-center rounded-full border border-white/30 px-8 py-4 text-[12px] uppercase tracking-[0.18em] font-semibold text-white hover:bg-white hover:text-[#142334] hover:-translate-y-1 transition-all duration-300"
              >
                Take the diagnostic
              </Link>
            </div>
          </div>

          <div className="bg-white/[0.055] border border-white/12 p-7 md:p-8 self-end">
            <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">
              Stay in the loop
            </p>
            <h3 className="mt-4 font-serif text-[31px] leading-tight">
              One useful career note a month.
            </h3>
            <p className="mt-4 text-[15px] leading-relaxed text-white/68">
              Practical prompts, new articles, and early access to resources. No noisy inbox energy.
            </p>
            <form className="mt-7 flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                name="email"
                placeholder="Email address"
                maxLength={120}
                autoComplete="email"
                className="min-w-0 flex-1 bg-white text-[#142334] px-4 py-3 outline-none border border-white focus:border-[#C9AD98] text-[14px]"
              />
              <button
                type="submit"
                className="bg-[#C9AD98] text-[#142334] px-5 py-3 text-[11px] uppercase tracking-[0.18em] font-semibold hover:bg-white transition"
              >
                Join
              </button>
            </form>
            <p className="mt-3 text-[12px] text-white/45">POPIA-conscious. Unsubscribe anytime.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 py-12 border-b border-white/12">
          <div>
            <Link href="/" className="inline-flex items-center" aria-label="Coach Kagiso home">
              <Image
                src="/images/branding/footer-logo.png"
                alt="Coach Kagiso"
                width={224}
                height={88}
                className="h-auto w-[180px] md:w-[210px]"
              />
            </Link>
            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-white/62">
              Career Development and Personal Brand Coach for capable people who are ready to stop being overlooked.
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">Navigate</p>
            <div className="mt-5 grid gap-3">
              {navigation.map((item) => (
                <Link key={item.label} href={item.href} className="text-[14px] text-white/70 hover:text-white transition">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">Support</p>
            <div className="mt-5 grid gap-3">
              {services.map((item) => (
                <span key={item} className="text-[14px] text-white/70">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">Contact</p>
            <div className="mt-5 grid gap-4">
              <a href="mailto:hello@coachkagiso.co.za" className="inline-flex items-center gap-3 text-[14px] text-white/70 hover:text-white transition">
                <Mail className="h-4 w-4 text-[#C9AD98]" />
                hello@coachkagiso.co.za
              </a>
              <a href="https://wa.me/27695124398" className="inline-flex items-center gap-3 text-[14px] text-white/70 hover:text-white transition">
                <MessageCircle className="h-4 w-4 text-[#C9AD98]" />
                069 512 4398
              </a>
              <div className="flex gap-3 pt-2">
                <a href="https://linkedin.com/in/coach-kagiso" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="h-10 w-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-[#142334] transition">
                  <Linkedin className="h-4 w-4" />
                </a>
                <a href="https://www.tiktok.com/@coach_kagiso" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="h-10 w-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-[#142334] transition">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
                <a href="https://facebook.com/coachkagiso" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="h-10 w-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-[#142334] transition">
                  <Facebook className="h-4 w-4" />
                </a>
                <Link href="/insights" aria-label="Read insights" className="h-10 w-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-[#142334] transition">
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row justify-between gap-4 text-[12px] uppercase tracking-[0.16em] text-white/45">
          <p>Copyright 2026 Coach Kagiso. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="https://kreativeforeflow.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
              Designed with love by Kreative Reflow
            </a>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
