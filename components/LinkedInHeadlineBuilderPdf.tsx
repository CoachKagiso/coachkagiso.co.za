import React from 'react';
import {
  Document,
  Font,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import {
  headlineChecklist,
  headlineRewrites,
  keywordBank,
  type HeadlineRewrite,
} from '@/lib/linkedin-headline-builder';

Font.register({
  family: 'Raleway',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/raleway/v37/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVvaooCP.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/raleway/v37/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVsEpYCP.ttf',
      fontWeight: 600,
    },
    {
      src: 'https://fonts.gstatic.com/s/raleway/v37/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVs9pYCP.ttf',
      fontWeight: 700,
    },
  ],
});

Font.register({
  family: 'Noto Serif Display',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/notoserifdisplay/v29/buERppa9f8_vkXaZLAgP0G5Wi6QmA1QaeYah2sovLCDq_ZgLyt3idQfktOG-PVpd4tgK.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/notoserifdisplay/v29/buERppa9f8_vkXaZLAgP0G5Wi6QmA1QaeYah2sovLCDq_ZgLyt3idQfktOG-PVpv4tgK.ttf',
      fontWeight: 500,
    },
    {
      src: 'https://fonts.gstatic.com/s/notoserifdisplay/v29/buERppa9f8_vkXaZLAgP0G5Wi6QmA1QaeYah2sovLCDq_ZgLyt3idQfktOG-PVqD5dgK.ttf',
      fontWeight: 600,
    },
    {
      src: 'https://fonts.gstatic.com/s/notoserifdisplay/v29/buERppa9f8_vkXaZLAgP0G5Wi6QmA1QaeYah2sovLCDq_ZgLyt3idQfktOG-PVq65dgK.ttf',
      fontWeight: 700,
    },
  ],
});

const colors = {
  ink: '#142334',
  rodeo: '#C9AD98',
  chai: '#E4D8CB',
  latte: '#BCA99A',
  white: '#FFFFFF',
  paper: '#FCFBFA',
};

function chunk<T>(items: T[], size: number) {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

const rewritePages = chunk(headlineRewrites, 4);
const keywordPages = chunk(keywordBank, 8);

const styles = StyleSheet.create({
  page: {
    position: 'relative',
    paddingTop: 48,
    paddingRight: 44,
    paddingBottom: 48,
    paddingLeft: 44,
    backgroundColor: colors.white,
    color: colors.ink,
    fontFamily: 'Raleway',
    fontSize: 10.2,
    lineHeight: 1.45,
  },
  darkPage: {
    backgroundColor: colors.ink,
    color: colors.white,
  },
  chaiPage: {
    backgroundColor: colors.chai,
  },
  logoText: {
    fontFamily: 'Noto Serif Display',
    fontWeight: 600,
    fontSize: 18,
    color: colors.white,
  },
  logoTextDark: {
    color: colors.ink,
  },
  coverBody: {
    marginTop: 144,
    width: 430,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: colors.rodeo,
    fontWeight: 700,
  },
  coverRule: {
    width: 248,
    height: 2,
    backgroundColor: colors.rodeo,
    marginTop: 18,
    marginBottom: 28,
  },
  coverTitle: {
    fontFamily: 'Noto Serif Display',
    fontWeight: 700,
    fontSize: 49,
    lineHeight: 0.98,
    color: colors.white,
  },
  coverSubtitle: {
    marginTop: 22,
    color: colors.chai,
    fontSize: 14,
    lineHeight: 1.55,
    width: 360,
  },
  coverFooter: {
    position: 'absolute',
    left: 44,
    right: 44,
    bottom: 42,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: colors.latte,
    fontSize: 9.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  pageHeader: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.rodeo,
    paddingBottom: 14,
  },
  pageLabel: {
    fontSize: 8.5,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.rodeo,
    fontWeight: 700,
  },
  h1: {
    marginTop: 8,
    fontFamily: 'Noto Serif Display',
    fontWeight: 600,
    fontSize: 34,
    lineHeight: 1.08,
    color: colors.ink,
  },
  h1Dark: {
    color: colors.white,
  },
  body: {
    fontSize: 11.4,
    lineHeight: 1.75,
    color: colors.ink,
  },
  muted: {
    color: '#6C625D',
  },
  listRow: {
    flexDirection: 'row',
    marginBottom: 9,
  },
  listNumber: {
    width: 24,
    color: colors.rodeo,
    fontWeight: 700,
  },
  listCopy: {
    flex: 1,
    fontSize: 11.2,
    lineHeight: 1.55,
  },
  callout: {
    marginTop: 26,
    padding: 18,
    backgroundColor: colors.chai,
    borderLeftWidth: 4,
    borderLeftColor: colors.rodeo,
  },
  calloutText: {
    fontSize: 11.4,
    lineHeight: 1.65,
    color: colors.ink,
  },
  formulaBlock: {
    marginTop: 18,
    marginBottom: 28,
    backgroundColor: colors.white,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.latte,
  },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  formulaItem: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 9,
  },
  formulaText: {
    fontFamily: 'Noto Serif Display',
    fontWeight: 600,
    fontSize: 16,
    lineHeight: 1.15,
    textAlign: 'center',
    color: colors.ink,
  },
  separator: {
    width: 1,
    backgroundColor: colors.rodeo,
  },
  table: {
    borderTopWidth: 1,
    borderTopColor: colors.latte,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.latte,
    minHeight: 52,
  },
  tableHead: {
    fontWeight: 700,
    fontSize: 8.7,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  tableCell: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 10,
    fontSize: 8.8,
    lineHeight: 1.45,
    color: colors.ink,
  },
  keywordGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  keywordCol: {
    flex: 1,
  },
  keywordItem: {
    paddingTop: 10,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#DED1C5',
  },
  keywordIndustry: {
    color: colors.rodeo,
    textTransform: 'uppercase',
    fontSize: 8.8,
    letterSpacing: 1.4,
    fontWeight: 700,
    marginBottom: 5,
  },
  keywordText: {
    fontSize: 9.4,
    lineHeight: 1.5,
    color: colors.ink,
  },
  rewriteCard: {
    paddingTop: 11,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.latte,
  },
  role: {
    marginBottom: 8,
    color: '#766C66',
    fontSize: 8.8,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  pillBefore: {
    width: 48,
    backgroundColor: colors.rodeo,
    paddingVertical: 3,
    textAlign: 'center',
    color: colors.white,
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  pillAfter: {
    width: 48,
    backgroundColor: colors.ink,
    paddingVertical: 3,
    textAlign: 'center',
    color: colors.white,
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  beforeText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 10.1,
    lineHeight: 1.35,
    color: colors.ink,
  },
  afterText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 10.2,
    lineHeight: 1.36,
    color: colors.ink,
    fontWeight: 700,
  },
  why: {
    marginTop: 7,
    marginLeft: 57,
    fontSize: 8.8,
    lineHeight: 1.45,
    color: '#766C66',
  },
  ctaBox: {
    marginTop: 24,
    padding: 22,
    backgroundColor: colors.chai,
    textAlign: 'center',
  },
  ctaHeading: {
    fontFamily: 'Noto Serif Display',
    fontWeight: 600,
    fontSize: 24,
    lineHeight: 1.15,
    color: colors.ink,
  },
  ctaBody: {
    marginTop: 10,
    fontSize: 11.5,
    lineHeight: 1.65,
    color: colors.ink,
  },
  ctaLink: {
    marginTop: 11,
    color: colors.rodeo,
    fontSize: 11.5,
    fontWeight: 700,
    textDecoration: 'none',
  },
  checkboxRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderColor: colors.rodeo,
    marginTop: 2,
    marginRight: 11,
  },
  checklistText: {
    flex: 1,
    color: colors.white,
    fontSize: 12.5,
    lineHeight: 1.5,
  },
  footerMeta: {
    position: 'absolute',
    left: 44,
    right: 44,
    bottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: colors.latte,
    fontSize: 8,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
});

function PageFooter() {
  return (
    <View style={styles.footerMeta} fixed>
      <Text>coachkagiso.co.za</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function PageShell({
  children,
  title,
  label,
  chai = false,
}: {
  children: React.ReactNode;
  title: string;
  label?: string;
  chai?: boolean;
}) {
  return (
    <Page size="A4" style={chai ? [styles.page, styles.chaiPage] : styles.page}>
      <View style={styles.pageHeader}>
        {label && <Text style={styles.pageLabel}>{label}</Text>}
        <Text style={styles.h1}>{title}</Text>
      </View>
      {children}
      <PageFooter />
    </Page>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, index) => (
        <View key={item} style={styles.listRow}>
          <Text style={styles.listNumber}>{index + 1}.</Text>
          <Text style={styles.listCopy}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function KeywordPage({ items, pageNumber }: { items: typeof keywordBank; pageNumber: number }) {
  const columns = chunk(items, Math.ceil(items.length / 2));

  return (
    <PageShell
      title="What SA Recruiters Actually Search"
      label={`Keyword bank, page ${pageNumber}`}
    >
      <Text style={[styles.body, styles.muted]}>
        These are high-frequency Boolean search terms used by SA recruiters on LinkedIn Recruiter
        in 2024-2026. Include the exact terms relevant to your industry in your headline, About
        section, and Skills.
      </Text>
      <View style={[styles.keywordGrid, { marginTop: 18 }]}>
        {columns.map((column, index) => (
          <View key={`keyword-col-${index}`} style={styles.keywordCol}>
            {column.map((item) => (
              <View key={item.industry} style={styles.keywordItem}>
                <Text style={styles.keywordIndustry}>{item.industry}</Text>
                <Text style={styles.keywordText}>{item.keywords}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      {pageNumber === keywordPages.length && (
        <View style={styles.callout}>
          <Text style={styles.calloutText}>
            Not sure which keywords apply to your role? Search for 3 job adverts for roles you want
            on LinkedIn Jobs or Pnet. Highlight every skill, tool, or qualification that appears
            more than once. Those are your keywords.
          </Text>
        </View>
      )}
    </PageShell>
  );
}

function RewritePage({ items, pageIndex }: { items: HeadlineRewrite[]; pageIndex: number }) {
  const groups = Array.from(new Set(items.map((item) => item.group))).join(' + ');

  return (
    <PageShell title={groups} label={`Headline rewrites, set ${pageIndex + 1}`} chai={pageIndex % 2 === 1}>
      {items.map((item) => (
        <View key={`${item.role}-${item.after}`} style={styles.rewriteCard} wrap={false}>
          <Text style={styles.role}>{item.role}</Text>
          <View style={styles.labelRow}>
            <Text style={styles.pillBefore}>Before</Text>
            <Text style={styles.beforeText}>{item.before}</Text>
          </View>
          <View style={styles.labelRow}>
            <Text style={styles.pillAfter}>After</Text>
            <Text style={styles.afterText}>{item.after}</Text>
          </View>
          <Text style={styles.why}>Why it works: {item.why}</Text>
        </View>
      ))}
    </PageShell>
  );
}

export default function LinkedInHeadlineBuilderPdf({ siteUrl }: { siteUrl: string }) {
  return (
    <Document
      title="The SA LinkedIn Headline Builder"
      author="Coach Kagiso"
      subject="39 before-and-after LinkedIn headline rewrites for South African professionals"
      keywords="LinkedIn headline, LinkedIn optimisation, South African recruiters, Coach Kagiso"
    >
      <Page size="A4" style={[styles.page, styles.darkPage]}>
        <Text style={styles.logoText}>Coach Kagiso</Text>
        <View style={styles.coverBody}>
          <Text style={styles.eyebrow}>The SA LinkedIn Headline Builder</Text>
          <View style={styles.coverRule} />
          <Text style={styles.coverTitle}>
            39 Before-and-After Headline Rewrites for South African Professionals
          </Text>
          <Text style={styles.coverSubtitle}>
            Plus the formula SA recruiters actually search, and the keyword bank by industry.
          </Text>
        </View>
        <View style={styles.coverFooter}>
          <Text>coachkagiso.co.za</Text>
          <Text>2026</Text>
        </View>
      </Page>

      <PageShell title="How to Use This Document">
        <Text style={styles.body}>
          This is not a list of templates to copy and paste. It is a tool.
        </Text>
        <Text style={[styles.body, { marginTop: 16, marginBottom: 12 }]}>
          Here is how to use it in 10 minutes:
        </Text>
        <NumberedList
          items={[
            'Find your industry or career stage in the contents below.',
            'Read the keyword bank for your sector. These are the exact terms SA recruiters search.',
            'Find the before-and-after example closest to your situation.',
            'Read the one-line explanation underneath each rewrite.',
            'Open your LinkedIn profile. Rewrite your headline using the formula on the next page.',
            'Run the checklist on the last page before you save.',
          ]}
        />
        <Text style={[styles.body, { marginTop: 10 }]}>
          The formula is on the next page. The keyword bank follows. The rewrites are grouped by
          industry and career stage. The checklist is on the final page.
        </Text>
        <View style={styles.callout}>
          <Text style={styles.calloutText}>
            Your LinkedIn headline is the most important field on your profile. LinkedIn&apos;s
            algorithm weights it at roughly five times the relevance of regular profile text. If a
            recruiter searches for your skills and your headline does not contain those exact words,
            you will not appear in their results, regardless of how good the rest of your profile is.
          </Text>
        </View>
      </PageShell>

      <PageShell title="The Formula SA Recruiters Actually Reward" chai>
        <View style={styles.formulaBlock}>
          <View style={styles.formulaRow}>
            {['Target Role', 'Specialty or Domain', 'Proof or Impact', 'Credibility or Location'].map(
              (item, index) => (
                <React.Fragment key={item}>
                  <View style={styles.formulaItem}>
                    <Text style={styles.formulaText}>{item}</Text>
                  </View>
                  {index < 3 && <View style={styles.separator} />}
                </React.Fragment>
              )
            )}
          </View>
        </View>
        <Text style={[styles.body, { fontWeight: 700, marginBottom: 12 }]}>
          SA-specific adjustments to global advice
        </Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableHead]}>What global advice says</Text>
            <Text style={[styles.tableCell, styles.tableHead]}>What SA reality requires</Text>
            <Text style={[styles.tableCell, styles.tableHead]}>What to do instead</Text>
          </View>
          {[
            [
              'Use your current job title',
              'SA recruiters search standard titles, not internal company designations. "Level III Associate" is invisible.',
              'Use the most commonly searched title for your function, not your internal title.',
            ],
            [
              'Add Open to Work',
              'SA recruiters are split. Some see it as proactive, others use it to negotiate lower salaries.',
              'Use "Open to [specific role] roles" in your headline rather than the generic banner.',
            ],
            [
              'Include your city',
              'SA recruiters search by city and province constantly.',
              'Always include your city. Add "Open to relocation" if relevant.',
            ],
            [
              'Show quantified results',
              'SA CVs describe duties, not achievements. Numbers make you stand out more here.',
              'Always quantify. Rough numbers beat vague claims. Use rands, percentages, and team sizes.',
            ],
            [
              'Be authentic',
              '"Passionate leader" and "results-driven professional" are common SA headline mistakes.',
              'Replace adjectives with searchable keywords and quantified proof.',
            ],
          ].map((row) => (
            <View key={row.join('|')} style={styles.tableRow}>
              {row.map((cell) => (
                <Text key={cell} style={styles.tableCell}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </PageShell>

      {keywordPages.map((items, index) => (
        <KeywordPage key={`keywords-${index}`} items={items} pageNumber={index + 1} />
      ))}

      {rewritePages.map((items, index) => (
        <RewritePage key={`rewrites-${index}`} items={items} pageIndex={index} />
      ))}

      <Page size="A4" style={[styles.page, styles.darkPage]}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageLabel}>60-second final check</Text>
          <Text style={[styles.h1, styles.h1Dark]}>Before You Save Your New Headline</Text>
        </View>
        <Text style={[styles.eyebrow, { marginBottom: 26 }]}>Run through this in 60 seconds.</Text>
        {headlineChecklist.map((item) => (
          <View key={item} style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checklistText}>{item}</Text>
          </View>
        ))}
        <View style={{ height: 2, backgroundColor: colors.rodeo, marginTop: 14 }} />
        <View style={styles.ctaBox}>
          <Text style={styles.ctaHeading}>
            Want me to rewrite your full LinkedIn profile, not just the headline?
          </Text>
          <Text style={styles.ctaBody}>
            The LinkedIn Optimisation service covers your headline, About section, experience
            bullets, skills, and featured section, written for how SA recruiters search in 2026.
          </Text>
          <Link src={`${siteUrl}/work-with-me`} style={styles.ctaLink}>
            coachkagiso.co.za/work-with-me
          </Link>
        </View>
        <View style={[styles.coverFooter, { bottom: 28 }]}>
          <Text>Coach Kagiso | coachkagiso.co.za</Text>
          <Text>(c) 2026 Coach Kagiso. All rights reserved.</Text>
        </View>
      </Page>
    </Document>
  );
}
