import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import InsightsIndex from '@/components/InsightsIndex';
import { getPublishedInsights } from '@/lib/published-insights';

// Evaluate the schedule per request, including after a deployment has been idle.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Career Insights & Advice South Africa',
  description:
    'Career strategy, personal branding, CV tips, job search, and promotion insights for South African professionals who want to get unstuck.',
  alternates: {
    canonical: '/insights',
  },
  openGraph: {
    title: 'Career Insights & Advice | Coach Kagiso',
    description:
      'Practical career strategy, personal branding, and job search advice for South African professionals.',
    url: '/insights',
  },
};

export default function InsightsPage() {
  return (
    <>
      <Navbar />
      <InsightsIndex insights={getPublishedInsights()} />
      <Footer />
    </>
  );
}
