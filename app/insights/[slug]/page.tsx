import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Clock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { AuditBreakLeadMagnet } from '@/components/ArticleLeadMagnets';
import ArticleShareActions from '@/components/ArticleShareActions';
import { ArticleFaqJsonLd, ArticleJsonLd, BreadcrumbJsonLd } from '@/app/JsonLd';
import { getInsightBySlug, getRelatedInsights, insights, type Insight, type InsightBodyBlock } from '@/lib/insights';

type ArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const articleAuthor = {
  name: 'Coach Kagiso',
  title: 'Career Development and Personal Brand Coach',
  image: '/images/author/ck-profile.png',
};

function RichParagraph({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={`${part}-${index}`} className="font-semibold text-[#142334]">
              {part.slice(2, -2)}
            </strong>
          );
        }

        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <em key={`${part}-${index}`} className="font-sans italic text-inherit">
              {part.slice(1, -1)}
            </em>
          );
        }

        if (!match) {
          return <span key={`${part}-${index}`}>{part}</span>;
        }

        const [, label, href] = match;
        const isInternal = href.startsWith('/');
        const className =
          'relative inline-flex items-baseline gap-1 font-semibold text-[#142334] no-underline transition hover:text-[#C9AD98] after:absolute after:-bottom-0.5 after:left-0 after:h-[1.5px] after:w-full after:origin-left after:scale-x-0 after:bg-[#C9AD98] after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100';
        const content = (
          <>
            <span>{label}</span>
            <ArrowUpRight aria-hidden="true" className="h-[0.82em] w-[0.82em] translate-y-[0.08em]" strokeWidth={2} />
          </>
        );

        if (isInternal) {
          return (
            <Link key={`${href}-${index}`} href={href} className={className}>
              {content}
            </Link>
          );
        }

        return (
          <a key={`${href}-${index}`} href={href} target="_blank" rel="noopener noreferrer" className={className}>
            {content}
          </a>
        );
      })}
    </>
  );
}

function AtsFlowVisual() {
  const steps = [
    { label: 'Submit', detail: 'CV enters the careers portal' },
    { label: 'Parse', detail: 'ATS extracts names, roles, skills' },
    { label: 'Match', detail: 'Keywords are scored against the job' },
    { label: 'Review', detail: 'Recruiter sees the strongest matches' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {steps.map((step, index) => (
        <div key={step.label} className="relative border border-[#D8C8BB] bg-[#FCFBFA] p-5">
          <span className="font-serif text-[34px] leading-none text-[#C9AD98]">
            {String(index + 1).padStart(2, '0')}
          </span>
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#142334]">
            {step.label}
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-[#142334]/68">{step.detail}</p>
          {index < steps.length - 1 && (
            <span className="absolute -right-3 top-1/2 hidden h-px w-6 bg-[#C9AD98] md:block" />
          )}
        </div>
      ))}
    </div>
  );
}

function PlainTextTestVisual() {
  const lines = [
    'Kagiso Mokoena',
    'Project Manager | Johannesburg',
    'Work Experience',
    'Led SAP rollout across 4 retail sites',
    'Education',
    'BCom Business Management, NQF 7',
  ];

  return (
    <div className="grid gap-5 md:grid-cols-[0.95fr_1.05fr] md:items-stretch">
      <div className="border border-[#D8C8BB] bg-[#FCFBFA] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
          Before the test
        </p>
        <div className="mt-5 grid grid-cols-[0.7fr_1fr] gap-3">
          <div className="space-y-3">
            <span className="block h-14 bg-[#E8E3DF]" />
            <span className="block h-4 bg-[#142334]/15" />
            <span className="block h-4 bg-[#142334]/15" />
            <span className="block h-4 bg-[#142334]/15" />
          </div>
          <div className="space-y-3">
            <span className="block h-6 bg-[#142334]/20" />
            <span className="block h-4 bg-[#C9AD98]/45" />
            <span className="block h-4 bg-[#142334]/15" />
            <span className="block h-4 bg-[#142334]/15" />
            <span className="block h-4 w-2/3 bg-[#142334]/15" />
          </div>
        </div>
      </div>
      <div className="border border-[#142334]/15 bg-[#142334] p-5 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
          Notepad output
        </p>
        <div className="mt-5 space-y-2 font-mono text-[13px] leading-relaxed text-white/78">
          {lines.map((line) => (
            <p key={line} className="border-b border-white/10 pb-2">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function KeywordZonesVisual() {
  const zones = [
    { label: 'Summary', width: 'w-[90%]' },
    { label: 'Key Skills', width: 'w-[76%]' },
    { label: 'Experience bullets', width: 'w-[84%]' },
  ];

  return (
    <div className="border border-[#D8C8BB] bg-[#FCFBFA] p-5 md:p-6">
      <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div>
          <p className="font-serif text-[34px] leading-tight text-[#142334]">
            Exact phrase.
            <br />
            Right place.
            <br />
            No stuffing.
          </p>
        </div>
        <div className="space-y-4">
          {zones.map((zone) => (
            <div key={zone.label}>
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-[#142334]/60">
                <span>{zone.label}</span>
                <span className="text-[#C9AD98]">Keyword zone</span>
              </div>
              <div className="h-3 bg-[#E8E3DF]">
                <span className={`block h-full ${zone.width} bg-[#C9AD98]`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LinkedinSearchVisual() {
  const layers = [
    { label: 'Keywords', detail: 'Role titles, tools, industry phrases' },
    { label: 'Completeness', detail: 'Photo, headline, About, skills, history' },
    { label: 'Activity', detail: 'Recent posts, comments, response signals' },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-[0.95fr_1.05fr] md:items-stretch">
      <div className="border border-[#D8C8BB] bg-[#FCFBFA] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
          Recruiter query
        </p>
        <div className="mt-5 space-y-3">
          <span className="block border border-[#142334]/12 bg-white px-4 py-3 text-[14px] text-[#142334]/76">
            Financial Manager CA(SA) Johannesburg
          </span>
          <span className="block border border-[#142334]/12 bg-white px-4 py-3 text-[14px] text-[#142334]/76">
            BBBEE Strategy | IFRS | SAP
          </span>
          <span className="block border border-[#142334]/12 bg-white px-4 py-3 text-[14px] text-[#142334]/76">
            Open to Work | Active recently
          </span>
        </div>
      </div>
      <div className="grid gap-3">
        {layers.map((layer, index) => (
          <div key={layer.label} className="grid grid-cols-[44px_1fr] gap-4 border border-[#D8C8BB] bg-white p-4">
            <span className="font-serif text-[30px] leading-none text-[#C9AD98]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#142334]">
                {layer.label}
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-[#142334]/68">{layer.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeadlineRewriteVisual() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="border border-[#D8C8BB] bg-[#FCFBFA] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
          Before
        </p>
        <p className="mt-6 font-serif text-[30px] leading-tight text-[#142334]">
          Project Manager
        </p>
        <p className="mt-4 text-[14px] leading-relaxed text-[#142334]/62">
          Clear, but too thin for search. It tells LinkedIn the role, not the context.
        </p>
      </div>
      <div className="border border-[#C9AD98]/70 bg-[#142334] p-5 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
          After
        </p>
        <p className="mt-6 font-serif text-[28px] leading-tight text-white">
          Project Manager | Agile & Prince2 | Delivered R80M Infrastructure Projects on Time | Johannesburg & SADC Region
        </p>
        <p className="mt-4 text-[14px] leading-relaxed text-white/66">
          Searchable role, technical context, proof, and location signal in one field.
        </p>
      </div>
    </div>
  );
}

function LinkedinChecklistVisual() {
  const checks = ['Headline', 'About', 'Experience', 'Featured', 'Skills', 'Activity'];

  return (
    <div className="border border-[#D8C8BB] bg-[#FCFBFA] p-5 md:p-6">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {checks.map((check, index) => (
          <div key={check} className="flex min-h-[92px] items-end justify-between border border-[#D8C8BB] bg-white p-4">
            <div>
              <span className="font-serif text-[30px] leading-none text-[#C9AD98]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#142334]">
                {check}
              </p>
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#C9AD98] text-[14px] text-[#C9AD98]">
              /
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManagerTimelineVisual() {
  const weeks = [
    { label: 'Week 1', title: 'Learn the landscape', detail: 'Clarify success with your manager and listen before changing anything.' },
    { label: 'Week 2', title: 'Set expectations', detail: 'Share what you heard, map stakeholders, and identify one or two quick wins.' },
    { label: 'Week 3', title: 'Start leading', detail: 'Delegate clearly, give feedback carefully, and create room for honest dialogue.' },
    { label: 'Week 4', title: 'Stabilise', detail: 'Reflect, ask for feedback, and shape the next 60 days with intention.' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {weeks.map((week, index) => (
        <div key={week.label} className="relative min-h-[220px] border border-[#D8C8BB] bg-[#FCFBFA] p-5 md:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
            {week.label}
          </p>
          <h4 className="mt-7 font-serif text-[30px] leading-tight text-[#142334]">{week.title}</h4>
          <p className="mt-4 text-[14px] leading-relaxed text-[#142334]/68">{week.detail}</p>
          <span className="absolute right-5 top-5 font-serif text-[46px] leading-none text-[#C9AD98]/20">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
      ))}
    </div>
  );
}

function UbuntuLeadershipVisual() {
  const signals = [
    'Dignity',
    'Fairness',
    'Relationship',
    'Accountability',
  ];

  return (
    <div className="grid gap-5 md:grid-cols-[0.85fr_1.15fr] md:items-center">
      <div className="border border-[#C9AD98]/45 bg-[#142334] p-6 text-white">
        <p className="font-serif text-[44px] leading-tight">
          I am because
          <br />
          we are.
        </p>
        <p className="mt-5 text-[14px] leading-relaxed text-white/68">
          In leadership, that means people are not a distraction from performance. They are the route to it.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {signals.map((signal, index) => (
          <div key={signal} className="border border-[#D8C8BB] bg-white p-5">
            <span className="font-serif text-[30px] leading-none text-[#C9AD98]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#142334]">
              {signal}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManagerChecklistVisual() {
  const days = ['Days 1-7', 'Days 8-14', 'Days 15-21', 'Days 22-30'];

  return (
    <div className="border border-[#D8C8BB] bg-[#FCFBFA] p-5 md:p-6">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {days.map((day, index) => (
          <div key={day} className="min-h-[112px] border border-[#D8C8BB] bg-white p-4">
            <span className="font-serif text-[30px] leading-none text-[#C9AD98]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <p className="mt-7 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#142334]">
              {day}
            </p>
            <span className="mt-4 block h-1.5 bg-[#E8E3DF]">
              <span className="block h-full bg-[#C9AD98]" style={{ width: `${(index + 1) * 25}%` }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CredentialMatrixVisual() {
  const tiers = [
    {
      label: 'Moves the needle',
      detail: 'Cloud certifications, PMP or PRINCE2, SETA NQF qualifications, and recognised professional pathways.',
    },
    {
      label: 'Useful signal',
      detail: 'LinkedIn Learning certificates and standalone short courses that support a skill you can demonstrate.',
    },
    {
      label: 'Window dressing',
      detail: 'Any certificate that does not show up in current SA job adverts for the roles you actually want.',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tiers.map((tier, index) => (
        <div key={tier.label} className="min-h-[210px] border border-[#C9AD98]/35 bg-white/7 p-5">
          <span className="font-serif text-[38px] leading-none text-[#C9AD98]">
            {String(index + 1).padStart(2, '0')}
          </span>
          <p className="mt-8 text-[12px] font-semibold uppercase tracking-[0.18em] text-white">
            {tier.label}
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-white/68">{tier.detail}</p>
        </div>
      ))}
    </div>
  );
}

function DataAccessVisual() {
  const options = [
    { label: 'Zero-rated', value: 'Vodacom Digital Skills Hub' },
    { label: 'Offline', value: 'LinkedIn Learning downloads' },
    { label: 'Data-light', value: 'Written modules and checklists' },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-[0.85fr_1.15fr] md:items-center">
      <div className="border border-[#D8C8BB] bg-white p-6">
        <p className="font-serif text-[42px] leading-tight text-[#142334]">
          Free is not free if data makes it unreachable.
        </p>
      </div>
      <div className="space-y-3">
        {options.map((option) => (
          <div key={option.label} className="grid grid-cols-[120px_1fr] gap-4 border border-[#D8C8BB] bg-[#FCFBFA] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9AD98]">
              {option.label}
            </p>
            <p className="text-[14px] leading-relaxed text-[#142334]/72">{option.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArticleImageInsert({
  insert,
}: {
  insert: NonNullable<Insight['imageInserts']>[number];
}) {
  const isDark = insert.variant === 'linkedinSearch' || insert.variant === 'ubuntuLeadership' || insert.variant === 'credentialMatrix';
  const visual = {
    atsFlow: <AtsFlowVisual />,
    plainTextTest: <PlainTextTestVisual />,
    keywordZones: <KeywordZonesVisual />,
    linkedinSearch: <LinkedinSearchVisual />,
    headlineRewrite: <HeadlineRewriteVisual />,
    linkedinChecklist: <LinkedinChecklistVisual />,
    managerTimeline: <ManagerTimelineVisual />,
    ubuntuLeadership: <UbuntuLeadershipVisual />,
    managerChecklist: <ManagerChecklistVisual />,
    credentialMatrix: <CredentialMatrixVisual />,
    dataAccess: <DataAccessVisual />,
  }[insert.variant];

  return (
    <figure
      className={`my-12 border p-5 md:p-7 ${
        isDark ? 'border-[#C9AD98]/35 bg-[#142334] text-white' : 'border-[#D8C8BB] bg-[#F4EEE9]'
      }`}
    >
      <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? 'text-[#C9AD98]' : 'text-[#A09086]'}`}>
        {insert.eyebrow}
      </p>
      <figcaption>
        <h3 className={`mt-3 max-w-2xl font-serif text-[30px] leading-tight md:text-[40px] ${isDark ? 'text-white' : 'text-[#142334]'}`}>
          {insert.title}
        </h3>
      </figcaption>
      <div className="mt-7">{visual}</div>
      <p className={`mt-5 max-w-2xl text-[14px] leading-relaxed ${isDark ? 'text-white/68' : 'text-[#142334]/64'}`}>
        {insert.caption}
      </p>
    </figure>
  );
}

function ArticleBodyBlock({ block }: { block: InsightBodyBlock }) {
  if (typeof block === 'string') {
    return (
      <p>
        <RichParagraph text={block} />
      </p>
    );
  }

  if (block.type === 'subheading') {
    return (
      <h3 className="pt-3 font-serif text-[28px] md:text-[34px] leading-tight text-[#142334]">
        <RichParagraph text={block.text} />
      </h3>
    );
  }

  const List = block.type === 'orderedList' ? 'ol' : 'ul';
  const listClassName =
    block.type === 'orderedList'
      ? 'list-decimal space-y-3 pl-6'
      : 'list-disc space-y-3 pl-6';

  return (
    <List className={listClassName}>
      {block.items.map((item) => (
        <li key={item} className="pl-1">
          <RichParagraph text={item} />
        </li>
      ))}
    </List>
  );
}

export function generateStaticParams() {
  return insights.map((insight) => ({
    slug: insight.slug,
  }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getInsightBySlug(slug);

  if (!article) {
    return {
      title: 'Insight not found | Coach Kagiso',
    };
  }

  return {
    title: article.metaTitle ?? `${article.title} | Career Insights`,
    description: article.metaDescription ?? article.dek,
    alternates: {
      canonical: `/insights/${slug}`,
    },
    openGraph: {
      type: 'article',
      title: article.metaTitle ?? article.title,
      description: article.metaDescription ?? article.dek,
      url: `/insights/${slug}`,
      images: [
        {
          url: article.image,
          width: 1200,
          height: 630,
          alt: article.imageAlt,
        },
      ],
      publishedTime: article.date,
      authors: ['Coach Kagiso'],
      tags: article.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.metaTitle ?? article.title,
      description: article.metaDescription ?? article.dek,
      images: [article.image],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getInsightBySlug(slug);

  if (!article) {
    notFound();
  }

  const related = getRelatedInsights(article.slug, 3);
  const articleUrl = `https://coachkagiso.co.za/insights/${article.slug}`;

  return (
    <>
      <ArticleJsonLd
        title={article.metaTitle ?? article.title}
        description={article.metaDescription ?? article.dek}
        slug={article.slug}
        datePublished={article.date}
        image={article.image}
      />
      {article.faqs && <ArticleFaqJsonLd items={article.faqs} />}
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: '/' },
          { name: 'Insights', href: '/insights' },
          { name: article.title, href: `/insights/${article.slug}` },
        ]}
      />
      <Navbar />
      <main className="font-sans bg-[#FCFBFA] text-[#142334] overflow-hidden">
        <section className="relative pt-[120px] pb-16 lg:pb-24 bg-[#E8E3DF]">
          <div className="absolute inset-x-0 top-[84px] text-center pointer-events-none select-none overflow-hidden">
            <span className="font-serif text-[22vw] md:text-[14vw] leading-none text-white/60 tracking-normal">
              FIELDNOTE
            </span>
          </div>
          <div className="relative z-10 max-w-[1180px] mx-auto px-6 lg:px-8">
            <Link href="/insights" className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] font-semibold text-[#142334]/70 hover:text-[#142334] transition">
              <ArrowLeft className="h-4 w-4" />
              Back to insights
            </Link>
            <div className="mt-12 grid lg:grid-cols-12 gap-10 lg:gap-14 items-end">
              <div className="lg:col-span-7">
                <div className="flex flex-wrap items-center gap-3 text-[12px] uppercase tracking-[0.2em] font-semibold text-[#A09086]">
                  <span>{article.category}</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {article.readTime}
                  </span>
                  <span>{article.date}</span>
                </div>
                <h1 className="mt-6 font-serif font-medium text-[46px] md:text-[78px] lg:text-[92px] leading-[0.95] tracking-normal">
                  {article.title}
                </h1>
                <p className="mt-8 max-w-[680px] text-[19px] leading-relaxed text-[#142334]/78">{article.dek}</p>
              </div>
              <div className="lg:col-span-4 lg:col-start-9">
                <Link
                  href="/about"
                  className="group flex max-w-[360px] items-center gap-4 border border-[#142334]/12 bg-white/55 p-4 backdrop-blur-sm transition hover:border-[#C9AD98]/70 hover:bg-white/78"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[#C9AD98]/45 bg-[#F4EEE9]">
                    <Image
                      src={articleAuthor.image}
                      alt={articleAuthor.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif text-[31px] leading-none text-[#142334] transition group-hover:text-[#C9AD98]">
                      {articleAuthor.name}
                    </p>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.2em] font-semibold text-[#142334]/60">
                      {articleAuthor.title}
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#FCFBFA]">
          <div className="relative max-w-[1180px] mx-auto px-6 lg:px-8 -mt-8 lg:-mt-14">
            <div className="relative aspect-[16/9] lg:aspect-[21/9] bg-[#142334] overflow-hidden shadow-2xl">
              <Image
                src={article.image}
                alt={article.imageAlt}
                fill
                priority
                referrerPolicy="no-referrer"
                className="object-cover"
              />
            </div>
          </div>
        </section>

        <section className="bg-[#FCFBFA] pt-12 lg:pt-16">
          <div className="max-w-[1180px] mx-auto px-6 lg:px-8">
            <div className="border-y border-[#142334]/15 py-7 lg:py-8 grid lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 lg:items-center">
              <div className="grid md:grid-cols-[170px_1fr] gap-5 md:gap-8 md:items-start">
                <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#A09086]">
                  In this article
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  {article.sections.map((section) => (
                    <a
                      key={section.heading}
                      href={`#${section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      className="text-[14px] leading-snug text-[#142334]/72 hover:text-[#142334] hover:underline hover:decoration-[#C9AD98] hover:decoration-2 hover:underline-offset-4 transition"
                    >
                      {section.heading}
                    </a>
                  ))}
                </div>
              </div>
              <ArticleShareActions articleUrl={articleUrl} title={article.title} />
            </div>
          </div>
        </section>

        <article className="bg-[#FCFBFA] py-16 lg:py-24">
          <div className="max-w-[820px] mx-auto px-6 lg:px-8">
            <div className="space-y-14">
              {article.sections.map((section, index) => (
                <section key={section.heading} id={section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')} className="scroll-mt-28">
                  {section.eyebrow && (
                    <p className="mb-4 text-[12px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">{section.eyebrow}</p>
                  )}
                  <h2 className="font-serif font-medium text-[34px] md:text-[46px] leading-tight">{section.heading}</h2>
                  <div className="mt-7 space-y-6 text-[18px] leading-[1.85] text-[#142334]/78">
                    {section.body.map((block) => (
                      <ArticleBodyBlock
                        key={typeof block === 'string' ? block : `${block.type}-${'text' in block ? block.text : block.items.join('|')}`}
                        block={block}
                      />
                    ))}
                  </div>
                  {article.imageInserts
                    ?.filter((insert) => insert.afterHeading === section.heading)
                    .map((insert) => (
                      <ArticleImageInsert key={`${insert.variant}-${section.heading}`} insert={insert} />
                    ))}
                  {article.pullQuote && index === 0 && (
                    <blockquote className="my-12 border-y border-[#142334]/15 py-10">
                      <p className="font-serif text-[30px] md:text-[42px] leading-tight text-[#142334]">
                        {article.pullQuote}
                      </p>
                    </blockquote>
                  )}
                  {article.leadMagnet && (article.leadMagnet.afterHeading ? article.leadMagnet.afterHeading === section.heading : index === 0) && (
                    <AuditBreakLeadMagnet {...article.leadMagnet} />
                  )}
                  {article.visualBreak?.afterHeading === section.heading && (
                    <div className="my-12 bg-[#E8E3DF] p-6 md:p-8">
                      <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#A09086]">
                        {article.visualBreak.eyebrow}
                      </p>
                      <h3 className="mt-3 max-w-2xl font-serif text-[30px] md:text-[40px] leading-tight text-[#142334]">
                        {article.visualBreak.title}
                      </h3>
                      <div className="mt-8 grid md:grid-cols-2 gap-4">
                        {article.visualBreak.items.map((item) => (
                          <div key={item.label} className="border border-[#C9AD98]/55 bg-[#FCFBFA] p-5">
                            <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#C9AD98]">
                              {item.label}
                            </p>
                            <p className="mt-4 font-serif text-[28px] leading-tight text-[#142334]">
                              {item.value}
                            </p>
                            {item.note && (
                              <p className="mt-4 text-[14px] leading-relaxed text-[#142334]/68">
                                {item.note}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              ))}
            </div>

            {article.takeaways && (
              <section className="mt-16 border-y border-[#142334]/15 py-10">
                <p className="text-[12px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                  Key takeaways
                </p>
                <h2 className="mt-3 font-serif font-medium text-[34px] md:text-[46px] leading-tight">
                  What to remember before you close this tab.
                </h2>
                <div className="mt-8 grid gap-3">
                  {article.takeaways.map((takeaway, index) => (
                    <div key={takeaway} className="grid grid-cols-[42px_1fr] gap-4 border border-[#D8C8BB] bg-white p-4">
                      <span className="font-serif text-[26px] leading-none text-[#C9AD98]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <p className="text-[16px] leading-relaxed text-[#142334]/76">{takeaway}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {article.faqs && (
              <section className="mt-16">
                <p className="text-[12px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                  FAQ
                </p>
                <h2 className="mt-3 font-serif font-medium text-[34px] md:text-[46px] leading-tight">
                  {article.faqHeading ?? 'Questions people ask before taking the next step.'}
                </h2>
                <div className="mt-8 border-t border-[#142334]/15">
                  {article.faqs.map((faq, index) => (
                    <div key={faq.question} className="grid gap-4 border-b border-[#142334]/15 py-7 md:grid-cols-[58px_1fr]">
                      <span className="font-serif text-[26px] leading-none text-[#C9AD98]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h3 className="font-serif text-[27px] leading-tight text-[#142334]">{faq.question}</h3>
                        <p className="mt-3 text-[16px] leading-relaxed text-[#142334]/72">{faq.answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {article.authorBio && (
              <section className="mt-16 bg-[#142334] p-7 md:p-9 text-white">
                <p className="text-[12px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">
                  Written by
                </p>
                <div className="mt-5 grid gap-7 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <h2 className="font-serif text-[40px] md:text-[54px] leading-none">{article.authorBio.name}</h2>
                    <p className="mt-3 text-[12px] uppercase tracking-[0.18em] font-semibold text-white/56">
                      {article.authorBio.role}
                    </p>
                    <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-white/72">
                      {article.authorBio.body}
                    </p>
                  </div>
                  <Link
                    href={article.authorBio.href}
                    className="inline-flex rounded-full border border-white/20 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white hover:text-[#142334]"
                  >
                    {article.authorBio.cta}
                  </Link>
                </div>
              </section>
            )}
          </div>
        </article>

        <section className="bg-white py-20 lg:py-28 border-t border-[#142334]/10">
          <div className="max-w-[1180px] mx-auto px-6 lg:px-8">
            <div className="flex items-end justify-between gap-8 mb-12">
              <div>
                <p className="text-[12px] uppercase tracking-[0.22em] font-semibold text-[#C9AD98]">Read next</p>
                <h2 className="mt-3 font-serif text-[42px] leading-tight">Keep building the plan.</h2>
              </div>
              <Link href="/insights" className="hidden md:inline-flex text-[12px] uppercase tracking-[0.2em] font-semibold text-[#142334] hover:text-[#C9AD98] transition">
                All insights
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {related.map((item) => (
                <Link key={item.slug} href={`/insights/${item.slug}`} className="group border-t border-[#142334]/15 pt-6">
                  <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[#A09086]">{item.category}</p>
                  <h3 className="mt-4 font-serif text-[27px] leading-tight group-hover:text-[#C9AD98] transition">{item.title}</h3>
                  <p className="mt-4 text-[14.5px] leading-relaxed text-[#142334]/70">{item.dek}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
