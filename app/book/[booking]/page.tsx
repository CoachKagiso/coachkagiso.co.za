import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FaqJsonLd } from '@/app/JsonLd';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageFaq from '@/components/PageFaq';
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
  const titleSuffix = page.mode === 'reservation' ? 'Reserve Your Seat' : 'Book Now';

  return {
    title: `${page.title} — ${titleSuffix}`,
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
  const faqEyebrow = page.mode === 'reservation' ? 'Before booking opens' : 'Before you book';
  const faqTitle = page.mode === 'reservation'
    ? 'A few things worth knowing before booking opens.'
    : 'A few things worth knowing first.';
  const faqDescription = page.mode === 'reservation'
    ? 'These are the questions that usually come up right before someone joins the reserve list.'
    : 'These are the questions that usually come up right before someone books a session.';
  const faqCtaLabel = page.mode === 'reservation' ? 'Ask about the masterclass' : 'Ask before booking';

  return (
    <main className="min-h-screen bg-[#FCFBFA] text-[#142334]">
      <FaqJsonLd items={page.faqs.map((item) => ({ question: item.question, answer: item.answer }))} />
      <Navbar />
      <BookingContent booking={booking} page={page} calUrl={calUrl} />
      <PageFaq
        eyebrow={faqEyebrow}
        title={faqTitle}
        description={faqDescription}
        items={page.faqs}
        ctaHref="/contact"
        ctaLabel={faqCtaLabel}
        backgroundClassName="bg-white"
      />
      <Footer />
    </main>
  );
}
