import type {Metadata} from 'next';
import { Raleway, Noto_Serif_Display, Dancing_Script } from 'next/font/google';
import SmoothScroll from '@/components/SmoothScroll';
import CookieNotice from '@/components/CookieNotice';
import MouseTrail from '@/components/MouseTrail';
import { OrganizationJsonLd } from '@/app/JsonLd';
import 'lenis/dist/lenis.css';
import './globals.css'; // Global styles

const raleway = Raleway({
  subsets: ['latin'],
  variable: '--font-sans',
});

const notoSerif = Noto_Serif_Display({
  subsets: ['latin'],
  variable: '--font-serif',
});

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  variable: '--font-signature',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://coachkagiso.co.za'),
  manifest: '/site.webmanifest',
  title: {
    default: 'Coach Kagiso | Career Coach South Africa — CV Reviews, LinkedIn, Clarity Sessions',
    template: '%s | Coach Kagiso',
  },
  description: 'Career development and personal brand coaching for South African professionals. CV reviews from R150, LinkedIn optimisation, career clarity sessions, and more. Show up. Stand out. Level up.',
  keywords: [
    'career coach south africa',
    'CV review south africa',
    'CV writing services',
    'linkedin optimisation south africa',
    'personal brand coach',
    'career coaching',
    'career clarity session',
    'interview preparation',
    'career change south africa',
  ],
  authors: [{ name: 'Kagiso Shabangu', url: 'https://coachkagiso.co.za/about' }],
  creator: 'Coach Kagiso',
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: 'https://coachkagiso.co.za',
    siteName: 'Coach Kagiso',
    title: 'Coach Kagiso | Career Coach South Africa',
    description: 'Career development and personal brand coaching for South African professionals. CV reviews, LinkedIn optimisation, clarity sessions, and more.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Coach Kagiso — Career Development & Personal Brand Coach, South Africa',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coach Kagiso | Career Coach South Africa',
    description: 'Career development and personal brand coaching for South African professionals.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: ['/favicon.ico'],
  },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${raleway.variable} ${notoSerif.variable} ${dancingScript.variable}`} suppressHydrationWarning>
      <body className="cursor-none font-sans antialiased text-[#142334] bg-white" suppressHydrationWarning>
        <OrganizationJsonLd />
        <MouseTrail />
        <SmoothScroll>{children}</SmoothScroll>
        <CookieNotice />
      </body>
    </html>
  );
}
