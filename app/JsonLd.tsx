/**
 * JSON-LD structured data components for SEO.
 * Renders <script type="application/ld+json"> blocks in the document head.
 */

/* ------------------------------------------------------------------ */
/*  Organisation + Person (used in root layout)                        */
/* ------------------------------------------------------------------ */
export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'Coach Kagiso',
    url: 'https://coachkagiso.co.za',
    description:
      'Career development and personal brand coaching for South African professionals. CV reviews, LinkedIn optimisation, clarity sessions, and more.',
    founder: {
      '@type': 'Person',
      name: 'Kagiso Shabangu',
      jobTitle: 'Career Development & Personal Brand Coach',
      url: 'https://coachkagiso.co.za/about',
    },
    areaServed: {
      '@type': 'Country',
      name: 'South Africa',
    },
    serviceType: [
      'Career Coaching',
      'CV Writing',
      'CV Review',
      'LinkedIn Optimisation',
      'Personal Brand Coaching',
      'Interview Preparation',
    ],
    priceRange: 'R150 – R1,200',
    email: 'hello@coachkagiso.co.za',
    telephone: '+27695124398',
    address: {
      '@type': 'PostalAddress',
      addressRegion: 'Gauteng',
      addressCountry: 'ZA',
    },
    sameAs: [
      'https://www.linkedin.com/in/coachkagiso',
      'https://wa.me/27695124398',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Service (used on /work-with-me)                                    */
/* ------------------------------------------------------------------ */
type ServiceJsonLdProps = {
  name: string;
  description: string;
  price: string;
  currency?: string;
  url: string;
};

export function ServiceJsonLd({
  name,
  description,
  price,
  currency = 'ZAR',
  url,
}: ServiceJsonLdProps) {
  const numericPrice = price.replace(/[^0-9.]/g, '');

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    provider: {
      '@type': 'ProfessionalService',
      name: 'Coach Kagiso',
      url: 'https://coachkagiso.co.za',
    },
    areaServed: { '@type': 'Country', name: 'South Africa' },
    offers: {
      '@type': 'Offer',
      price: numericPrice,
      priceCurrency: currency,
      url: `https://coachkagiso.co.za${url}`,
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ (used on homepage and contact)                                 */
/* ------------------------------------------------------------------ */
type FaqItem = { question: string; answer: string };

export function FaqJsonLd({ items }: { items: FaqItem[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

type ArticleFaqItem = {
  question: string;
  answer: string;
};

export function ArticleFaqJsonLd({ items }: { items: ArticleFaqItem[] }) {
  return <FaqJsonLd items={items.map((item) => ({ question: item.question, answer: item.answer }))} />;
}

/* ------------------------------------------------------------------ */
/*  Article (used on /insights/[slug])                                 */
/* ------------------------------------------------------------------ */
type ArticleJsonLdProps = {
  title: string;
  description: string;
  slug: string;
  datePublished: string;
  image: string;
};

export function ArticleJsonLd({
  title,
  description,
  slug,
  datePublished,
  image,
}: ArticleJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: `https://coachkagiso.co.za/insights/${slug}`,
    datePublished,
    image,
    author: {
      '@type': 'Person',
      name: 'Coach Kagiso',
      url: 'https://coachkagiso.co.za/about',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Coach Kagiso',
      url: 'https://coachkagiso.co.za',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Breadcrumb                                                         */
/* ------------------------------------------------------------------ */
type BreadcrumbItem = { name: string; href: string };

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://coachkagiso.co.za${item.href}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
