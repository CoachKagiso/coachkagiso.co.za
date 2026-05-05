import path from 'node:path';
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
import type { DiagnosticArchetype } from '@/lib/career-diagnostic';

Font.register({
  family: 'Geist',
  src: path.join(
    process.cwd(),
    'node_modules',
    'next',
    'dist',
    'compiled',
    '@vercel',
    'og',
    'Geist-Regular.ttf'
  ),
});

const colors = {
  ink: '#142334',
  warm: '#C9AD98',
  sand: '#E4D8CB',
  mist: '#F7F1EC',
  white: '#FFFFFF',
  slate: '#516173',
  blush: '#FCFBFA',
};

function getArchetypeAccent(key: DiagnosticArchetype['key']) {
  const accents = {
    A: { soft: '#F7F1EC', line: '#C9AD98' },
    B: { soft: '#EEF4F8', line: '#8BAEC3' },
    C: { soft: '#F4EDE9', line: '#B98E78' },
    D: { soft: '#F1EEE9', line: '#A9907F' },
    E: { soft: '#EDF2EF', line: '#9EAF9C' },
  };

  return accents[key];
}

const styles = StyleSheet.create({
  page: {
    position: 'relative',
    paddingTop: 44,
    paddingBottom: 54,
    paddingHorizontal: 40,
    backgroundColor: colors.blush,
    color: colors.ink,
    fontFamily: 'Geist',
    fontSize: 11,
    lineHeight: 1.6,
  },
  motifClusterTop: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 168,
    height: 168,
    opacity: 0.52,
  },
  motifClusterBottom: {
    position: 'absolute',
    bottom: 26,
    left: 22,
    width: 140,
    height: 140,
    opacity: 0.42,
  },
  motifStroke: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#DFCFC0',
    borderRadius: 999,
  },
  motifRect: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#E5D8CC',
  },
  masthead: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.ink,
    paddingTop: 26,
    paddingRight: 24,
    paddingBottom: 24,
    paddingLeft: 24,
    marginBottom: 18,
  },
  mastheadGlow: {
    position: 'absolute',
    top: -34,
    right: -12,
    width: 182,
    height: 182,
    borderWidth: 1,
    borderColor: 'rgba(201, 173, 152, 0.25)',
    borderRadius: 999,
  },
  mastheadGlowInner: {
    position: 'absolute',
    top: -6,
    right: 18,
    width: 116,
    height: 116,
    borderWidth: 1,
    borderColor: 'rgba(201, 173, 152, 0.22)',
    borderRadius: 999,
  },
  pill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(201, 173, 152, 0.45)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  pillText: {
    color: colors.warm,
    fontSize: 8.5,
    letterSpacing: 2.1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.white,
    fontFamily: 'Times-Roman',
    fontSize: 30,
    lineHeight: 1.05,
    marginBottom: 8,
    maxWidth: 360,
  },
  tagline: {
    color: '#D8E0E8',
    fontSize: 12,
    lineHeight: 1.6,
    maxWidth: 350,
  },
  mastheadMeta: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.11)',
  },
  mastheadMetaText: {
    color: 'rgba(255, 255, 255, 0.62)',
    fontSize: 9,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },
  symbolRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  symbolMark: {
    width: 52,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(201, 173, 152, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolShape: {
    width: 26,
    height: 26,
    borderWidth: 1,
    borderColor: colors.warm,
  },
  symbolCircle: {
    borderRadius: 999,
  },
  symbolTextWrap: {
    flex: 1,
  },
  symbolLabel: {
    color: colors.white,
    fontFamily: 'Times-Roman',
    fontSize: 15,
    lineHeight: 1.2,
  },
  symbolMeaning: {
    marginTop: 3,
    color: 'rgba(255, 255, 255, 0.62)',
    fontSize: 9.5,
    lineHeight: 1.45,
  },
  introBand: {
    marginBottom: 16,
    padding: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sand,
    borderLeftWidth: 4,
    borderLeftColor: colors.warm,
  },
  sectionLabel: {
    fontSize: 8.8,
    letterSpacing: 2.25,
    textTransform: 'uppercase',
    color: colors.warm,
    marginBottom: 7,
  },
  body: {
    color: colors.slate,
    fontSize: 11,
    lineHeight: 1.65,
  },
  actionPanel: {
    marginBottom: 16,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.sand,
    padding: 18,
  },
  actionDisplay: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#DDCFC2',
  },
  heroAction: {
    color: colors.ink,
    fontFamily: 'Times-Roman',
    fontSize: 23,
    lineHeight: 1.22,
  },
  boxedSection: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.white,
    padding: 16,
  },
  listRow: {
    flexDirection: 'row',
    gap: 11,
    marginBottom: 10,
  },
  listIndex: {
    width: 20,
    color: colors.warm,
    fontFamily: 'Times-Roman',
    fontSize: 16,
  },
  listText: {
    flex: 1,
    color: colors.slate,
    fontSize: 11,
    lineHeight: 1.6,
  },
  trapCard: {
    marginBottom: 16,
    backgroundColor: colors.ink,
    padding: 18,
  },
  trapBody: {
    color: colors.white,
    fontSize: 12,
    lineHeight: 1.65,
  },
  gridSection: {
    marginBottom: 16,
  },
  gridHeadline: {
    marginBottom: 10,
    fontFamily: 'Times-Roman',
    fontSize: 22,
    lineHeight: 1.18,
    color: colors.ink,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 14,
  },
  col: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sand,
    padding: 15,
  },
  colHeading: {
    color: colors.ink,
    fontFamily: 'Times-Roman',
    fontSize: 18,
    lineHeight: 1.2,
    marginBottom: 8,
  },
  progressCard: {
    marginBottom: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sand,
    padding: 16,
  },
  progressBand: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E7DCCF',
  },
  promptCard: {
    marginBottom: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sand,
    padding: 18,
  },
  promptText: {
    color: colors.ink,
    fontFamily: 'Times-Italic',
    fontSize: 16,
    lineHeight: 1.55,
  },
  footerCard: {
    marginTop: 2,
    backgroundColor: colors.ink,
    padding: 18,
  },
  footerHeading: {
    color: colors.white,
    fontFamily: 'Times-Roman',
    fontSize: 22,
    lineHeight: 1.2,
    marginBottom: 8,
  },
  footerBody: {
    color: '#D8E0E8',
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 14,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warm,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  ctaText: {
    color: colors.ink,
    fontSize: 9.8,
    fontWeight: 700,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  footerLinks: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  footerLinkText: {
    color: '#E9D8C9',
    fontSize: 10,
    lineHeight: 1.6,
  },
  pageFooter: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerMeta: {
    color: '#8A99A7',
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});

type DiagnosticPlaybookPdfProps = {
  archetype: DiagnosticArchetype;
  siteUrl: string;
};

function NumberedList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, index) => (
        <View key={`${item}-${index}`} style={styles.listRow} wrap={false}>
          <Text style={styles.listIndex}>{String(index + 1).padStart(2, '0')}</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function ArchetypeSymbol({ archetype }: { archetype: DiagnosticArchetype }) {
  const symbolShapeByKey = {
    A: styles.symbolCircle,
    B: { height: 4, marginVertical: 11 },
    C: { borderTopLeftRadius: 999, borderTopRightRadius: 999 },
    D: styles.symbolCircle,
    E: { width: 30, height: 30 },
  };

  return (
    <View style={styles.symbolRow}>
      <View style={styles.symbolMark}>
        <View style={[styles.symbolShape, symbolShapeByKey[archetype.key]]} />
      </View>
      <View style={styles.symbolTextWrap}>
        <Text style={styles.symbolLabel}>{archetype.symbol.label}</Text>
        <Text style={styles.symbolMeaning}>{archetype.symbol.meaning}</Text>
      </View>
    </View>
  );
}

function MotifCluster({
  bottom = false,
}: {
  bottom?: boolean;
}) {
  return (
    <View style={bottom ? styles.motifClusterBottom : styles.motifClusterTop}>
      <View style={[styles.motifStroke, { top: 0, left: 22, right: 0, bottom: 22 }]} />
      <View style={[styles.motifStroke, { top: 14, left: 36, right: 14, bottom: 36 }]} />
      <View style={[styles.motifStroke, { top: 28, left: 50, right: 28, bottom: 50 }]} />
      <View style={[styles.motifRect, { top: 18, left: 0, width: 62, height: 62 }]} />
      <View style={[styles.motifRect, { bottom: 0, right: 20, width: 50, height: 50 }]} />
    </View>
  );
}

export default function DiagnosticPlaybookPdf({
  archetype,
  siteUrl,
}: DiagnosticPlaybookPdfProps) {
  const playbookUrl = `${siteUrl}/resources/career-diagnostic/playbooks/${archetype.playbook.slug}`;
  const supportUrl = `${siteUrl}${archetype.href}`;
  const accent = getArchetypeAccent(archetype.key);

  return (
    <Document
      title={`${archetype.name} Playbook`}
      author="Coach Kagiso"
      subject="Career diagnostic playbook"
      keywords="career diagnostic, coach kagiso, career strategy, south africa"
    >
      <Page size="A4" style={styles.page}>
        <MotifCluster />
        <MotifCluster bottom />

        <View style={styles.masthead} wrap={false}>
          <View style={styles.mastheadGlow} />
          <View style={styles.mastheadGlowInner} />

          <View style={styles.pill}>
            <Text style={styles.pillText}>Coach Kagiso | Career Diagnostic Playbook</Text>
          </View>

          <Text style={styles.title}>{archetype.playbook.title}</Text>
          <Text style={styles.tagline}>{archetype.tagline}</Text>

          <View style={styles.mastheadMeta}>
            <Text style={styles.mastheadMetaText}>
              South African career strategy notes for the next move that needs naming.
            </Text>
          </View>

          <ArchetypeSymbol archetype={archetype} />
        </View>

        <View style={[styles.introBand, { borderLeftColor: accent.line }]} wrap={false}>
          <Text style={styles.sectionLabel}>What this result usually means</Text>
          <Text style={styles.body}>{archetype.playbook.intro}</Text>
        </View>

        <View style={[styles.actionPanel, { backgroundColor: accent.soft }]} wrap={false}>
          <Text style={styles.sectionLabel}>Your next 7 days</Text>
          <Text style={styles.body}>
            This is not meant to be a perfect plan. It is the first useful move that makes the
            problem more visible and the next decision less abstract.
          </Text>
          <View style={styles.actionDisplay}>
            <Text style={styles.heroAction}>{archetype.action}</Text>
          </View>
        </View>

        <View style={styles.boxedSection} wrap={false}>
          <Text style={styles.sectionLabel}>{archetype.actionPlanTitle}</Text>
          <NumberedList items={archetype.actionPlan} />
        </View>

        <View style={styles.trapCard} wrap={false}>
          <Text style={styles.sectionLabel}>Avoid this trap</Text>
          <Text style={styles.trapBody}>{archetype.avoidThis}</Text>
        </View>

        <View style={styles.gridSection} wrap={false}>
          <Text style={styles.gridHeadline}>Read the pattern before you force a solution.</Text>
          <View style={styles.twoCol}>
            <View style={styles.col} wrap={false}>
              <Text style={styles.sectionLabel}>{archetype.playbook.signalsTitle}</Text>
              <Text style={styles.colHeading}>What tends to show up</Text>
              <NumberedList items={archetype.playbook.signals} />
            </View>
            <View style={styles.col} wrap={false}>
              <Text style={styles.sectionLabel}>{archetype.playbook.prioritiesTitle}</Text>
              <Text style={styles.colHeading}>Where to focus next</Text>
              <NumberedList items={archetype.playbook.priorities} />
            </View>
          </View>
        </View>

        <View style={styles.progressCard} wrap={false}>
          <Text style={styles.sectionLabel}>{archetype.playbook.progressTitle}</Text>
          <Text style={styles.body}>
            The goal is not to feel solved in one week. The goal is to create enough traction that
            the next move stops living only in your head.
          </Text>
          <View style={styles.progressBand}>
            <NumberedList items={archetype.playbook.progress} />
          </View>
        </View>

        <View style={styles.promptCard} wrap={false}>
          <Text style={styles.sectionLabel}>Journal prompt</Text>
          <Text style={styles.promptText}>{archetype.playbook.journalPrompt}</Text>
        </View>

        <View style={styles.footerCard} wrap={false}>
          <Text style={styles.sectionLabel}>Best next move</Text>
          <Text style={styles.footerHeading}>{archetype.nextStepTitle}</Text>
          <Text style={styles.footerBody}>{archetype.nextStepBody}</Text>
          <Link src={supportUrl} style={styles.ctaButton}>
            <Text style={styles.ctaText}>
              {archetype.cta}
              {' ->'}
            </Text>
          </Link>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLinkText}>Playbook on the web: {playbookUrl}</Text>
            <Text style={styles.footerLinkText}>Support route: {supportUrl}</Text>
          </View>
        </View>

        <View style={styles.pageFooter} fixed>
          <Text style={styles.footerMeta}>coachkagiso.co.za</Text>
          <Text
            style={styles.footerMeta}
            render={({ pageNumber, totalPages }) => `Playbook ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
