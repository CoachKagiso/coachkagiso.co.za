import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: "You're Booked | Coach Kagiso",
};

export default function BookedThanksPage() {
  return (
    <main className="min-h-screen bg-[#FCFBFA] text-[#142334]">
      <Navbar />
      <section className="mx-auto max-w-[820px] px-6 pb-24 pt-[140px] text-center lg:px-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#C9AD98]/20 text-[#142334]">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-7 font-serif text-[48px] leading-tight md:text-[72px]">
          You&apos;re booked.
        </h1>
        <p className="mt-6 text-[18px] leading-relaxed text-[#142334]/74">
          Check your email for your confirmation and Microsoft Teams link. See you soon.
        </p>
        <p className="mt-5 font-serif text-[28px] text-[#C9AD98]">— Kagiso</p>
        <Link
          href="/"
          className="mt-10 inline-flex items-center justify-center gap-2 rounded-full bg-[#142334] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
        >
          Back home <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>
      <Footer />
    </main>
  );
}
