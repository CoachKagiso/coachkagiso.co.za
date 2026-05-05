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
  formerPeerScript,
  impactReportSections,
  listeningTourQuestions,
  managerChecklistPhases,
  managerScorecard,
  quickWinCriteria,
  type ChecklistAction,
  type ChecklistPhase,
} from '@/lib/first-90-days-checklist';

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
  paper: '#FCFBFA',
  muted: '#6C625D',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  page: {
    position: 'relative',
    paddingTop: 44,
    paddingRight: 42,
    paddingBottom: 42,
    paddingLeft: 42,
    backgroundColor: colors.white,
    color: colors.ink,
    fontFamily: 'Raleway',
    fontSize: 9.4,
    lineHeight: 1.4,
  },
  darkPage: {
    backgroundColor: colors.ink,
    color: colors.white,
  },
  chaiPage: {
    backgroundColor: colors.chai,
  },
  logo: {
    fontFamily: 'Noto Serif Display',
    fontSize: 18,
    fontWeight: 600,
  },
  coverBody: {
    marginTop: 116,
    width: 430,
  },
  eyebrow: {
    color: colors.rodeo,
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  coverRule: {
    width: 250,
    height: 2,
    marginTop: 18,
    marginBottom: 26,
    backgroundColor: colors.rodeo,
  },
  coverTitle: {
    fontFamily: 'Noto Serif Display',
    fontSize: 50,
    fontWeight: 700,
    lineHeight: 0.98,
  },
  coverSubtitle: {
    width: 370,
    marginTop: 22,
    color: colors.chai,
    fontSize: 13.6,
    lineHeight: 1.55,
  },
  coverFooter: {
    position: 'absolute',
    left: 42,
    right: 42,
    bottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: colors.latte,
    fontSize: 8.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  pageHeader: {
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.rodeo,
  },
  pageLabel: {
    color: colors.rodeo,
    fontSize: 8.2,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  h1: {
    marginTop: 7,
    fontFamily: 'Noto Serif Display',
    fontSize: 31,
    fontWeight: 600,
    lineHeight: 1.05,
  },
  h1Dark: {
    color: colors.white,
  },
  body: {
    color: colors.ink,
    fontSize: 10.8,
    lineHeight: 1.65,
  },
  bodyDark: {
    color: colors.chai,
  },
  muted: {
    color: colors.muted,
  },
  fieldGrid: {
    marginTop: 26,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  field: {
    width: '48%',
    marginRight: 10,
    marginBottom: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.latte,
  },
  fieldLabel: {
    color: colors.rodeo,
    fontSize: 7.4,
    fontWeight: 700,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  fieldLine: {
    height: 18,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D8C8BB',
  },
  principleRow: {
    flexDirection: 'row',
    marginBottom: 9,
  },
  principleNumber: {
    width: 22,
    color: colors.rodeo,
    fontWeight: 700,
  },
  principleCopy: {
    flex: 1,
    fontSize: 10.2,
    lineHeight: 1.5,
  },
  scorecard: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.latte,
  },
  scoreRow: {
    flexDirection: 'row',
    minHeight: 54,
    borderBottomWidth: 1,
    borderBottomColor: colors.latte,
  },
  scoreArea: {
    width: 80,
    paddingTop: 10,
    paddingRight: 8,
    color: colors.ink,
    fontSize: 8.4,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  scoreQuestion: {
    flex: 1,
    paddingTop: 9,
    paddingRight: 10,
    color: colors.ink,
    fontSize: 9.4,
    lineHeight: 1.45,
  },
  scoreBox: {
    width: 34,
    marginTop: 10,
    marginRight: 6,
    height: 25,
    borderWidth: 1,
    borderColor: colors.latte,
  },
  phaseIntro: {
    padding: 14,
    backgroundColor: colors.chai,
    borderLeftWidth: 4,
    borderLeftColor: colors.rodeo,
  },
  phaseIntroText: {
    color: colors.ink,
    fontSize: 10.5,
    lineHeight: 1.55,
  },
  actionCard: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D8C8BB',
  },
  actionTop: {
    flexDirection: 'row',
  },
  checkbox: {
    width: 12,
    height: 12,
    marginTop: 2,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.rodeo,
  },
  actionText: {
    flex: 1,
    fontSize: 9.4,
    lineHeight: 1.43,
  },
  output: {
    marginTop: 5,
    marginLeft: 20,
    color: colors.muted,
    fontSize: 8.7,
    lineHeight: 1.35,
  },
  saLens: {
    marginTop: 5,
    marginLeft: 20,
    color: colors.ink,
    fontSize: 8.3,
    lineHeight: 1.35,
  },
  twoCol: {
    flexDirection: 'row',
  },
  col: {
    width: '48%',
    marginRight: 16,
  },
  miniCard: {
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D8C8BB',
    backgroundColor: colors.paper,
  },
  miniTitle: {
    color: colors.rodeo,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  miniText: {
    marginTop: 7,
    color: colors.ink,
    fontSize: 9.1,
    lineHeight: 1.45,
  },
  templateLine: {
    height: 18,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D8C8BB',
  },
  scriptBox: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.rodeo,
    backgroundColor: colors.ink,
  },
  scriptText: {
    color: colors.white,
    fontSize: 10,
    lineHeight: 1.55,
  },
  ctaBox: {
    marginTop: 24,
    padding: 18,
    backgroundColor: colors.white,
  },
  ctaHeading: {
    color: colors.ink,
    fontFamily: 'Noto Serif Display',
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 1.15,
  },
  ctaBody: {
    marginTop: 10,
    color: colors.ink,
    fontSize: 10.4,
    lineHeight: 1.55,
  },
  ctaLink: {
    marginTop: 12,
    color: colors.rodeo,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textDecoration: 'none',
  },
});

function PageFooter() {
  return (
    <View style={styles.coverFooter}>
      <Text>Coach Kagiso | First 90 Days Checklist</Text>
      <Text>coachkagiso.co.za</Text>
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
  label: string;
  chai?: boolean;
}) {
  return (
    <Page size="A4" style={chai ? [styles.page, styles.chaiPage] : styles.page}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageLabel}>{label}</Text>
        <Text style={styles.h1}>{title}</Text>
      </View>
      {children}
      <PageFooter />
    </Page>
  );
}

function ActionItem({ item }: { item: ChecklistAction }) {
  return (
    <View style={styles.actionCard} wrap={false}>
      <View style={styles.actionTop}>
        <View style={styles.checkbox} />
        <Text style={styles.actionText}>{item.action}</Text>
      </View>
      <Text style={styles.output}>Output: {item.output}</Text>
      {item.saLens && <Text style={styles.saLens}>SA lens: {item.saLens}</Text>}
    </View>
  );
}

function PhasePage({ phase, index }: { phase: ChecklistPhase; index: number }) {
  return (
    <PageShell
      title={phase.title}
      label={`${phase.phase} | ${phase.timeline}`}
      chai={index % 2 === 1}
    >
      <View style={styles.phaseIntro}>
        <Text style={styles.phaseIntroText}>{phase.theme}</Text>
      </View>
      <View style={{ marginTop: 8 }}>
        {phase.actions.map((action) => (
          <ActionItem key={action.action} item={action} />
        ))}
      </View>
    </PageShell>
  );
}

function Field({ label }: { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldLine} />
    </View>
  );
}

function MiniCard({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.miniCard} wrap={false}>
      <Text style={styles.miniTitle}>{title}</Text>
      <Text style={styles.miniText}>{text}</Text>
    </View>
  );
}

export default function First90DaysChecklistPdf({ siteUrl }: { siteUrl: string }) {
  return (
    <Document
      title="The First 90 Days Checklist for New Managers in South Africa"
      author="Coach Kagiso"
      subject="A practical 90-day operating kit for first-time managers in South Africa"
      keywords="first 90 days manager, South Africa leadership checklist, first-time manager, Coach Kagiso"
    >
      <Page size="A4" style={[styles.page, styles.darkPage]}>
        <Text style={styles.logo}>Coach Kagiso</Text>
        <View style={styles.coverBody}>
          <Text style={styles.eyebrow}>South African manager operating kit</Text>
          <View style={styles.coverRule} />
          <Text style={styles.coverTitle}>
            The First 90 Days Checklist for New Managers
          </Text>
          <Text style={styles.coverSubtitle}>
            A premium 4-phase working guide for building trust, setting rhythm, choosing the
            right first win, and leading with practical SA workplace awareness.
          </Text>
        </View>
        <View style={styles.coverFooter}>
          <Text>coachkagiso.co.za</Text>
          <Text>2026</Text>
        </View>
      </Page>

      <PageShell title="How to Use This Kit" label="Start here">
        <Text style={styles.body}>
          This is not a motivational PDF. It is a working document for your first quarter in
          management. Use it before your 1:1s, after difficult meetings, and before your Day 30,
          Day 60, and Day 90 check-ins.
        </Text>
        <View style={styles.fieldGrid}>
          {['Name', 'Role', 'Start date', 'Manager', 'Day 30 check-in', 'Day 60 check-in'].map(
            (label) => (
              <Field key={label} label={label} />
            )
          )}
        </View>
        <View style={{ marginTop: 16 }}>
          {[
            'Tick an action only when you can point to the output.',
            'Use the SA lens notes as prompts for HR, People Ops, and your own judgement.',
            'Do not try to fix everything in Week 1. Your credibility grows when people see you understand the system before you change it.',
            'Take this into your Day 30, Day 60, and Day 90 conversations. It gives you language for progress before everything is perfect.',
          ].map((item, index) => (
            <View key={item} style={styles.principleRow}>
              <Text style={styles.principleNumber}>{index + 1}.</Text>
              <Text style={styles.principleCopy}>{item}</Text>
            </View>
          ))}
        </View>
      </PageShell>

      <PageShell title="The 90-Day Manager Scorecard" label="Premium worksheet" chai>
        <Text style={[styles.body, styles.muted]}>
          Rate each area at Day 30, Day 60, and Day 90. The point is not to give yourself a
          perfect score. The point is to see where your leadership system needs attention.
        </Text>
        <View style={styles.scorecard}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreArea}>Area</Text>
            <Text style={styles.scoreQuestion}>Question</Text>
            <Text style={[styles.scoreArea, { width: 38 }]}>D30</Text>
            <Text style={[styles.scoreArea, { width: 38 }]}>D60</Text>
            <Text style={[styles.scoreArea, { width: 38 }]}>D90</Text>
          </View>
          {managerScorecard.map((item) => (
            <View key={item.area} style={styles.scoreRow} wrap={false}>
              <Text style={styles.scoreArea}>{item.area}</Text>
              <Text style={styles.scoreQuestion}>{item.question}</Text>
              <View style={styles.scoreBox} />
              <View style={styles.scoreBox} />
              <View style={styles.scoreBox} />
            </View>
          ))}
        </View>
        <View style={{ marginTop: 22 }}>
          <Text style={styles.eyebrow}>Review prompts</Text>
          <View style={{ marginTop: 12 }}>
            {[
              'What truth am I hearing now that I did not hear in Week 1?',
              'Which promise, decision, or meeting rhythm has most improved trust?',
              'What am I avoiding because it feels politically or relationally uncomfortable?',
              'What support do I need from my manager before the next checkpoint?',
            ].map((item) => (
              <MiniCard key={item} title="Prompt" text={item} />
            ))}
          </View>
        </View>
      </PageShell>

      {managerChecklistPhases.map((phase, index) => (
        <PhasePage key={phase.phase} phase={phase} index={index} />
      ))}

      <PageShell title="Conversation Scripts and Question Bank" label="Use before meetings">
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.eyebrow}>Former peer reset</Text>
            <View style={styles.scriptBox}>
              <Text style={styles.scriptText}>{formerPeerScript.opener}</Text>
              <Text style={[styles.scriptText, { marginTop: 8 }]}>{formerPeerScript.middle}</Text>
              <Text style={[styles.scriptText, { marginTop: 8 }]}>{formerPeerScript.close}</Text>
            </View>
            <View style={{ marginTop: 14 }}>
              <Text style={styles.eyebrow}>Quick win selector</Text>
              <View style={{ marginTop: 9 }}>
                {quickWinCriteria.map((item) => (
                  <View key={item} style={styles.principleRow}>
                    <View style={styles.checkbox} />
                    <Text style={styles.principleCopy}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          <View style={styles.col}>
            <Text style={styles.eyebrow}>Listening tour questions</Text>
            <View style={{ marginTop: 9 }}>
              {listeningTourQuestions.map((group) => (
                <View key={group.audience} style={styles.miniCard} wrap={false}>
                  <Text style={styles.miniTitle}>{group.audience}</Text>
                  {group.questions.map((question) => (
                    <Text key={question} style={styles.miniText}>
                      - {question}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>
      </PageShell>

      <Page size="A4" style={[styles.page, styles.darkPage]}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageLabel}>Day 90 deliverable</Text>
          <Text style={[styles.h1, styles.h1Dark]}>Your Impact Report Template</Text>
        </View>
        <Text style={[styles.body, styles.bodyDark]}>
          Use this structure for your Day 90 conversation. It helps your manager see judgement,
          evidence, and direction, not just activity.
        </Text>
        <View style={{ marginTop: 20 }}>
          {impactReportSections.map((section) => (
            <View key={section} style={{ marginBottom: 12 }} wrap={false}>
              <Text style={styles.eyebrow}>{section}</Text>
              <View style={[styles.templateLine, { borderBottomColor: colors.latte }]} />
              <View style={[styles.templateLine, { borderBottomColor: colors.latte }]} />
            </View>
          ))}
        </View>
        <View style={styles.ctaBox}>
          <Text style={styles.ctaHeading}>Need help becoming the manager people trust?</Text>
          <Text style={styles.ctaBody}>
            Coach Kagiso helps professionals move from promotion pressure into clearer leadership,
            stronger communication, and better career decisions.
          </Text>
          <Link src={`${siteUrl}/work-with-me`} style={styles.ctaLink}>
            coachkagiso.co.za/work-with-me
          </Link>
        </View>
        <View style={[styles.coverFooter, { bottom: 24 }]}>
          <Text>Coach Kagiso | coachkagiso.co.za</Text>
          <Text>(c) 2026 Coach Kagiso. All rights reserved.</Text>
        </View>
      </Page>
    </Document>
  );
}
