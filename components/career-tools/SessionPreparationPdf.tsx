import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import type { ClientSessionPreparationRecord } from '@/lib/client-session-preparation';
import type { SessionPreparationExportOptions } from '@/lib/client-session-preparation-export';

const NAVY = '#142334';
const MUTED = '#66717C';
const TAUPE = '#8C7466';
const RULE = '#D8C8BB';
const AMBER = '#FFF1CC';
const GREEN = '#F1F7F2';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    color: NAVY,
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    lineHeight: 1.42,
    paddingBottom: 36,
    paddingHorizontal: 38,
    paddingTop: 34,
  },
  pageCompact: {
    fontSize: 8.5,
    lineHeight: 1.32,
    paddingHorizontal: 32,
    paddingTop: 28,
  },
  kicker: {
    color: TAUPE,
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    color: NAVY,
    fontFamily: 'Times-Roman',
    fontSize: 23,
    lineHeight: 1.08,
    marginBottom: 10,
  },
  meta: {
    color: MUTED,
    fontSize: 8,
    marginBottom: 12,
  },
  opening: {
    color: '#42505E',
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 12,
  },
  urgency: {
    backgroundColor: AMBER,
    borderColor: '#E8C77C',
    borderRadius: 4,
    borderWidth: 1,
    color: '#6D4911',
    fontSize: 8.5,
    marginBottom: 13,
    padding: 8,
  },
  sectionTitle: {
    borderBottomColor: RULE,
    borderBottomWidth: 1,
    color: TAUPE,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 10,
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  stage: {
    borderBottomColor: '#E8E3DF',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingBottom: 7,
    paddingTop: 7,
  },
  stageTiming: {
    color: TAUPE,
    fontSize: 7.5,
    fontWeight: 700,
    paddingRight: 8,
    textTransform: 'uppercase',
    width: 76,
  },
  stageBody: {
    flex: 1,
  },
  stageTitle: {
    fontFamily: 'Times-Roman',
    fontSize: 13,
    lineHeight: 1.16,
    marginBottom: 3,
  },
  stagePurpose: {
    color: '#42505E',
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: 3,
    marginTop: 2,
  },
  tag: {
    backgroundColor: '#F5F0EB',
    borderRadius: 3,
    color: '#6B5143',
    fontSize: 6.5,
    fontWeight: 700,
    marginRight: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    textTransform: 'uppercase',
  },
  cue: {
    color: '#6B5A50',
    fontSize: 7.7,
    marginTop: 3,
    paddingLeft: 8,
  },
  question: {
    borderBottomColor: '#E8E3DF',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingBottom: 7,
    paddingTop: 7,
  },
  number: {
    color: '#A99080',
    fontFamily: 'Times-Roman',
    fontSize: 13,
    width: 28,
  },
  questionBody: {
    flex: 1,
  },
  questionText: {
    fontSize: 9.5,
    fontWeight: 700,
    lineHeight: 1.35,
  },
  rationale: {
    color: MUTED,
    fontSize: 8,
    marginTop: 3,
  },
  closeBox: {
    backgroundColor: GREEN,
    borderColor: '#B8CCBC',
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 12,
    padding: 9,
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bulletMark: {
    color: TAUPE,
    width: 12,
  },
  bulletText: {
    flex: 1,
  },
  lensGroup: {
    borderBottomColor: '#E8E3DF',
    borderBottomWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
  },
  lensLabel: {
    color: TAUPE,
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  hypothesis: {
    backgroundColor: AMBER,
    borderLeftColor: '#D8A84E',
    borderLeftWidth: 3,
    marginTop: 12,
    padding: 9,
  },
  privateBanner: {
    backgroundColor: NAVY,
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 10,
    padding: 7,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  footer: {
    bottom: 16,
    color: '#7A7A7A',
    fontSize: 7,
    left: 38,
    position: 'absolute',
    right: 38,
    textAlign: 'center',
  },
});

const SOURCE_LABELS = {
  intake: 'Intake',
  cv_analysis: 'CV analysis',
  earlier_diagnostic: 'Earlier diagnostic',
} as const;

function PageFooter({ privateNotes }: { privateNotes: boolean }) {
  return (
    <Text
      fixed
      style={styles.footer}
      render={({ pageNumber, totalPages }) => (
        `${privateNotes ? 'Private coaching preparation - not for client distribution | ' : ''}Page ${pageNumber} of ${totalPages}`
      )}
    />
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item) => (
        <View key={item} style={styles.bullet}>
          <Text style={styles.bulletMark}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function SessionHeader({
  preparation,
  clientName,
}: {
  preparation: ClientSessionPreparationRecord;
  clientName: string;
}) {
  const service = preparation.serviceSlug === 'career-clarity' ? 'Career Clarity' : 'Glow Up VIP';
  return (
    <>
      <Text style={styles.kicker}>Session preparation</Text>
      <Text style={styles.title}>{preparation.content.sessionFocus}</Text>
      <Text style={styles.meta}>{clientName || 'Client'} | {service} | 60 min | Microsoft Teams</Text>
      <Text style={styles.opening}>{preparation.content.openingFrame}</Text>
      {preparation.content.urgencyNote ? <Text style={styles.urgency}>{preparation.content.urgencyNote}</Text> : null}
    </>
  );
}

function Flow({
  preparation,
  includeCues,
  compact,
}: {
  preparation: ClientSessionPreparationRecord;
  includeCues: boolean;
  compact: boolean;
}) {
  return (
    <>
      <SectionTitle>{preparation.content.format === 'timed_v3' ? 'Timed conversation flow' : 'Conversation flow'}</SectionTitle>
      {preparation.content.conversationFlow.map((step, index) => {
        const timing = step.startMinute === null || step.endMinute === null
          ? `Stage ${index + 1}`
          : `${step.startMinute}-${step.endMinute} min`;
        return (
          <View key={`${step.stage}-${index}`} style={styles.stage} wrap={false}>
            <Text style={styles.stageTiming}>{timing}</Text>
            <View style={styles.stageBody}>
              <Text style={styles.stageTitle}>{step.stage}</Text>
              {(step.priority || step.deliverables.length > 0) && (
                <View style={styles.tagRow}>
                  {step.priority ? <Text style={styles.tag}>{step.priority.replace('_', ' ')}</Text> : null}
                  {step.deliverables.map((deliverable) => <Text key={deliverable} style={styles.tag}>{deliverable}</Text>)}
                </View>
              )}
              <Text style={styles.stagePurpose}>{step.purpose}</Text>
              {compact && includeCues && step.listenFor.map((cue) => <Text key={cue} style={styles.cue}>• {cue}</Text>)}
            </View>
          </View>
        );
      })}
      {compact && includeCues && preparation.content.legacyListenFor.length > 0 && (
        <>
          <SectionTitle>General notes for this session</SectionTitle>
          <BulletList items={preparation.content.legacyListenFor} />
        </>
      )}
    </>
  );
}

function QuestionsAndClose({
  preparation,
  includeCues,
  compact,
}: {
  preparation: ClientSessionPreparationRecord;
  includeCues: boolean;
  compact: boolean;
}) {
  return (
    <>
      <SectionTitle>{preparation.content.format === 'timed_v3' ? 'Priority questions' : 'Priority questions'}</SectionTitle>
      {preparation.content.priorityQuestions.map((question, index) => (
        <View key={question.question} style={styles.question} wrap={false}>
          <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
          <View style={styles.questionBody}>
            <Text style={styles.questionText}>
              {question.priority === 'must_ask' ? 'MUST ASK  ' : question.priority === 'if_time' ? 'IF TIME  ' : ''}
              {question.question}
            </Text>
            <Text style={styles.rationale}>{question.whyItMatters}</Text>
          </View>
        </View>
      ))}
      {!compact && includeCues && (
        <>
          <SectionTitle>Listen for</SectionTitle>
          {preparation.content.conversationFlow.flatMap((step) => step.listenFor.map((cue) => `${step.stage}: ${cue}`)).length > 0
            ? <BulletList items={preparation.content.conversationFlow.flatMap((step) => step.listenFor.map((cue) => `${step.stage}: ${cue}`))} />
            : preparation.content.legacyListenFor.length > 0
              ? <BulletList items={preparation.content.legacyListenFor} />
              : <Text style={styles.rationale}>No additional listening cues were saved.</Text>}
        </>
      )}
      <View style={styles.closeBox} wrap={false}>
        <Text style={styles.lensLabel}>Close with</Text>
        <BulletList items={preparation.content.closeWith} />
      </View>
    </>
  );
}

function CoachingLens({ preparation }: { preparation: ClientSessionPreparationRecord }) {
  const grouped = Object.entries(
    preparation.content.groundedCoachNotes.reduce<Record<string, string[]>>((result, note) => {
      (result[note.source] ||= []).push(note.note);
      return result;
    }, {}),
  ) as Array<[keyof typeof SOURCE_LABELS, string[]]>;

  return (
    <>
      <Text style={styles.privateBanner}>Private coaching lens - verify hypotheses before relying on them</Text>
      <Text style={styles.kicker}>Coaching lens</Text>
      <Text style={styles.title}>Context to review before the conversation.</Text>
      {grouped.length > 0 && (
        <>
          <SectionTitle>Grounded notes</SectionTitle>
          {grouped.map(([source, notes]) => (
            <View key={source} style={styles.lensGroup} wrap={false}>
              <Text style={styles.lensLabel}>{SOURCE_LABELS[source]}</Text>
              <BulletList items={notes} />
            </View>
          ))}
        </>
      )}
      {preparation.content.judgmentCalls.length > 0 && (
        <View style={styles.hypothesis}>
          <Text style={styles.lensLabel}>Hypothesis - verify with client</Text>
          <BulletList items={preparation.content.judgmentCalls} />
        </View>
      )}
      {preparation.content.legacyCoachNotes.length > 0 && (
        <>
          <SectionTitle>Legacy coach notes - source not classified</SectionTitle>
          <Text style={styles.rationale}>These notes predate source separation. Verify them before relying on them.</Text>
          <View style={{ marginTop: 7 }}><BulletList items={preparation.content.legacyCoachNotes} /></View>
        </>
      )}
    </>
  );
}

export default function SessionPreparationPdf({
  preparation,
  clientName,
  options,
}: {
  preparation: ClientSessionPreparationRecord;
  clientName: string;
  options: SessionPreparationExportOptions;
}) {
  const compact = options.layout === 'compact';
  const pageStyle = compact ? [styles.page, styles.pageCompact] : styles.page;
  const privateNotes = options.includeLens;

  return (
    <Document
      author="Coach Kagiso"
      subject="Private coaching session preparation"
      title={`${clientName || 'Client'} session preparation`}
    >
      {options.includeGuide && (
        <Page size="A4" style={pageStyle}>
          <SessionHeader preparation={preparation} clientName={clientName} />
          <Flow preparation={preparation} includeCues={options.includeCues} compact={compact} />
          <PageFooter privateNotes={privateNotes} />
        </Page>
      )}
      {options.includeGuide && (
        <Page size="A4" style={pageStyle}>
          <Text style={styles.kicker}>Session guide - continued</Text>
          <QuestionsAndClose preparation={preparation} includeCues={options.includeCues} compact={compact} />
          {compact && options.includeLens && (
            <View style={{ marginTop: 14 }}>
              <CoachingLens preparation={preparation} />
            </View>
          )}
          <PageFooter privateNotes={privateNotes} />
        </Page>
      )}
      {options.includeLens && (!compact || !options.includeGuide) && (
        <Page size="A4" style={pageStyle}>
          <CoachingLens preparation={preparation} />
          <PageFooter privateNotes />
        </Page>
      )}
    </Document>
  );
}
