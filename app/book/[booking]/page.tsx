import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { FaqJsonLd } from '@/app/JsonLd';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageFaq from '@/components/PageFaq';
import Reveal from '@/components/Reveal';
import BookingContent from './BookingContent';
import { bookingPages, type BookingSlug } from '@/lib/buying-flow';

type BookPageProps = {
  params: Promise<{ booking: string }>;
};

export function generateStaticParams() {
  return Object.keys(bookingPages).map((booking) => ({ booking }));
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { booking } = await params;
  const page = bookingPages[booking as BookingSlug];
  if (!page) return {};

  return {
    title: `${page.title} — Book Now`,
    description: page.description,
    alternates: {
      canonical: `/book/${booking}`,
    },
    openGraph: {
      title: `${page.title} | Coach Kagiso`,
      description: page.description,
      url: `/book/${booking}`,
    },
  };
}

function getBookingUrl(slug: BookingSlug) {
  const page = bookingPages[slug];
  return process.env[page.envKey] || page.fallbackUrl;
}

export default async function BookPage({ params }: BookPageProps) {
  const { booking } = await params;
  const page = bookingPages[booking as BookingSlug];
  if (!page) notFound();

  const calUrl = getBookingUrl(booking as BookingSlug);

  return (
    <main className="min-h-screen bg-[#FCFBFA] text-[#142334]">
      <FaqJsonLd items={page.faqs.map((item) => ({ question: item.question, answer: item.answer }))} />
      <Navbar />
      <BookingContent booking={booking} page={page} calUrl={calUrl} />
      <PageFaq
        eyebrow="Before you book"
        title="A few things worth knowing first."
        description="These are the questions that usually come up right before someone books a session."
        items={page.faqs}
        ctaHref="/contact"
        ctaLabel="Ask before booking"
        backgroundClassName="bg-white"
      />
      <Footer />
    </main>
  );
}
