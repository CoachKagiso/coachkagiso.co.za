import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CareerDiagnostic from '@/components/CareerDiagnostic';

export const metadata: Metadata = {
  title: '5-Minute Career Diagnostic | Coach Kagiso',
  description:
    'Take the free 5-Minute Career Diagnostic for South African professionals and discover whether you are stuck, stalling, pivoting, or ready to move with strategy.',
  alternates: {
    canonical: '/resources/career-diagnostic',
  },
  openGraph: {
    title: '5-Minute Career Diagnostic | Coach Kagiso',
    description:
      'Find your career archetype and receive a practical next step for your current career season.',
    url: '/resources/career-diagnostic',
  },
};

export default function CareerDiagnosticPage() {
  return (
    <>
      <Navbar />
      <CareerDiagnostic />
      <Footer />
    </>
  );
}
