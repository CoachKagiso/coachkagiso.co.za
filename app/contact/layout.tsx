import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Coach Kagiso | Career Coach South Africa',
  description:
    'Get in touch with Coach Kagiso for career coaching, CV reviews, LinkedIn optimisation, or a free discovery call. Based in Gauteng, working with professionals across South Africa.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact Coach Kagiso | Career Coach South Africa',
    description:
      'Book a free discovery call, send a message, or reach out on WhatsApp. Career coaching and CV services for South African professionals.',
    url: '/contact',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
