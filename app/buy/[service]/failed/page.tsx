import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { asyncServices, getAsyncService } from '@/lib/buying-flow';

type FailedPageProps = {
  params: Promise<{ service: string }>;
};

export const metadata: Metadata = {
  title: 'Payment Failed | Coach Kagiso',
};

export function generateStaticParams() {
  return Object.keys(asyncServices).map((service) => ({ service }));
}

export default async function FailedPage({ params }: FailedPageProps) {
  const { service: serviceSlug } = await params;
  const service = getAsyncService(serviceSlug);
  if (!service) notFound();

  return (
    <main className="min-h-screen bg-[#FCFBFA] text-[#142334]">
      <Navbar />
      <section className="mx-auto max-w-[820px] px-6 pb-24 pt-[140px] text-center lg:px-8">
        <p className="inline-flex rounded-full border border-[#C9AD98]/60 px-4 py-1 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#C9AD98]">
          Payment issue
        </p>
        <h1 className="mt-6 font-serif text-[48px] leading-tight md:text-[70px]">
          Payment didn&apos;t go through.
        </h1>
        <p className="mt-6 text-[18px] leading-relaxed text-[#142334]/74">
          This is usually a card or bank issue, not your fault. Try a different card or use the EFT option. If it keeps failing, WhatsApp me and I&apos;ll send a manual invoice.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={`/buy/${service.slug}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#142334] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
          >
            Try payment again <ArrowUpRight className="h-4 w-4" />
          </Link>
          <a
            href="https://wa.me/27695124398"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#142334]/25 px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:bg-[#142334] hover:text-white"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp Kagiso
          </a>
        </div>
      </section>
      <Footer />
    </main>
  );
}
