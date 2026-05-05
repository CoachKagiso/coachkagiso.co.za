import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Marquee from '@/components/Marquee';
import WhoIWorkWith from '@/components/WhoIWorkWith';
import LeadMagnet from '@/components/LeadMagnet';
import About from '@/components/About';
import Testimonials from '@/components/Testimonials';
import FAQ from '@/components/FAQ';
import ResourcesTeaser from '@/components/ResourcesTeaser';
import GroupPrograms from '@/components/GroupPrograms';
import ContactForm from '@/components/ContactForm';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Coach Kagiso | Career Coach South Africa — CV Reviews, LinkedIn, Clarity Sessions',
  description:
    'Career development and personal brand coaching for South African professionals. CV reviews from R150, LinkedIn optimisation, career clarity sessions, and group masterclasses. Show up. Stand out. Level up.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Coach Kagiso | Career Coach South Africa',
    description:
      'CV reviews, LinkedIn optimisation, career clarity sessions, and group masterclasses for South African professionals.',
    url: '/',
  },
};

export default function Home() {
  return (
    <main className="font-sans bg-white text-[#142334] leading-relaxed">
      <Navbar />
      <Hero />
      <Marquee />
      <WhoIWorkWith />
      <LeadMagnet />
      <About />
      <Testimonials />
      <GroupPrograms />
      <ResourcesTeaser />
      <FAQ />
      <ContactForm />
      <Footer />
    </main>
  );
}
