import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AboutPage from '@/components/AboutPage';

export const metadata: Metadata = {
  title: 'About Coach Kagiso | Career Development Coach, South Africa',
  description:
    'Meet Coach Kagiso — a career development and personal brand coach based in Gauteng, helping capable South African professionals get unstuck, visible, and moving.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Coach Kagiso | Career Development Coach, South Africa',
    description:
      'Career development and personal brand coach based in Gauteng, helping South African professionals get unstuck and level up.',
    url: '/about',
  },
};

export default function About() {
  return (
    <>
      <Navbar />
      <AboutPage />
      <Footer />
    </>
  );
}
