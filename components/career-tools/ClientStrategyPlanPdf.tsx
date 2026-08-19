import type { ReactElement } from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ClientStrategyPlanRecord } from '@/lib/client-strategy-plan';
import {
  buildClientStrategyPlanAtAGlance,
  buildClientStrategyPlanCover,
  buildClientStrategyPlanExportSections,
  buildClientStrategyPlanWorksheet,
  isAmberCalloutHeading,
  isChaiCalloutHeading,
  isClientActionHeading,
  CLIENT_NOTE_HEADING,
  type ClientStrategyPlanExportOptions,
  type PlanAtAGlance,
  type PlanCover,
  type PlanExportSection,
  type PlanWorksheet,
} from '@/lib/client-strategy-plan-export';

const NAVY = '#142334';
const MUTED = '#66717C';
const TAUPE = '#8C7466';
const RULE = '#D8C8BB';
const CHAI = '#E4D8CB';
const AMBER = '#FFF1CC';

const styles = StyleSheet.create({
  page: { padding: 42, paddingBottom: 52, color: NAVY, fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.45 },
  draft: { backgroundColor: AMBER, color: '#6D4911', fontSize: 8, fontWeight: 700, letterSpacing: 1.1, marginBottom: 14, padding: 7, textAlign: 'center' },
  kicker: { color: TAUPE, fontSize: 8, fontWeight: 700, letterSpacing: 1.2, marginBottom: 7, textTransform: 'uppercase' },
  title: { fontFamily: 'Times-Roman', fontSize: 25, lineHeight: 1.1, marginBottom: 8 },
  meta: { borderBottomColor: RULE, borderBottomWidth: 1, color: MUTED, fontSize: 8.5, marginBottom: 20, paddingBottom: 16 },
  section: { marginBottom: 22 },
  sectionTitle: { borderBottomColor: RULE, borderBottomWidth: 1, fontFamily: 'Times-Roman', fontSize: 18, marginBottom: 12, paddingBottom: 5 },
  entry: { borderBottomColor: '#EFE9E3', borderBottomWidth: 1, marginBottom: 11, paddingBottom: 11 },
  entryLast: { marginBottom: 11 },
  heading: { color: TAUPE, fontSize: 8, fontWeight: 700, letterSpacing: 0.8, marginBottom: 4, textTransform: 'uppercase' },
  body: { whiteSpace: 'pre-wrap' },
  bullet: { flexDirection: 'row', marginBottom: 4 },
  bulletMark: { color: TAUPE, width: 12 },
  bulletText: { flex: 1 },
  calloutChai: { backgroundColor: CHAI, marginBottom: 11, padding: 11 },
  calloutAmber: { backgroundColor: AMBER, borderColor: '#E8C77C', borderRadius: 4, borderWidth: 1, marginBottom: 11, padding: 10 },
  calloutHeadingChai: { color: NAVY, fontSize: 8, fontWeight: 700, letterSpacing: 0.8, marginBottom: 4, textTransform: 'uppercase' },
  calloutHeadingAmber: { color: '#6D4911', fontSize: 8, fontWeight: 700, letterSpacing: 0.8, marginBottom: 4, textTransform: 'uppercase' },
  // Anchored from the top, not the bottom: react-pdf 4.5 drops a bottom-anchored absolute
  // child whenever the Page style carries a lineHeight, which is why earlier packs shipped
  // with no page numbers at all. 814 puts the 7pt line ~18pt off the foot of an A4 page.
  footer: { color: '#777777', fontSize: 7, left: 42, position: 'absolute', right: 42, textAlign: 'center', top: 814 },
  checkbox: { borderColor: TAUPE, borderWidth: 1, height: 9, marginRight: 5, marginTop: 3, width: 9 },
  glanceTitle: { fontFamily: 'Times-Roman', fontSize: 30, lineHeight: 1.06, marginBottom: 10 },
  glanceRule: { backgroundColor: TAUPE, height: 2, marginBottom: 22, width: 116 },
  glanceLabel: { color: TAUPE, fontSize: 8, fontWeight: 700, letterSpacing: 1.1, marginBottom: 5, textTransform: 'uppercase' },
  glanceLead: { fontSize: 12.5, lineHeight: 1.5, marginBottom: 18 },
  glanceBody: { fontSize: 10.5, lineHeight: 1.55, marginBottom: 20 },
  glancePanel: { backgroundColor: CHAI, marginBottom: 24, padding: 14 },
  glancePanelText: { fontSize: 12, lineHeight: 1.5 },
  glanceRow: { borderBottomColor: RULE, borderBottomWidth: 1, flexDirection: 'row', paddingBottom: 9, paddingTop: 9 },
  glanceRowLabel: { color: TAUPE, fontSize: 8, fontWeight: 700, letterSpacing: 1, paddingRight: 10, textTransform: 'uppercase', width: 62 },
  glanceRowBody: { flex: 1 },
  sheetIntro: { color: MUTED, fontSize: 9.5, lineHeight: 1.5, marginBottom: 20 },
  sheetDateRow: { alignItems: 'flex-end', flexDirection: 'row', marginBottom: 24 },
  sheetDateLine: { borderBottomColor: RULE, borderBottomWidth: 1, height: 11, marginLeft: 10, width: 170 },
  sheetQuestion: { fontSize: 11, lineHeight: 1.45, marginBottom: 4 },
  // 24pt clears a line of handwriting; anything tighter and the sheet cannot actually be used.
  ruledLine: { borderBottomColor: RULE, borderBottomWidth: 1, height: 24 },
  // The cover carries more margin than the content pages on purpose: it is the one page with
  // nothing to fit, so the whitespace is what makes it read as a document rather than a printout.
  cover: { color: NAVY, fontFamily: 'Helvetica', fontSize: 10, padding: 54, paddingBottom: 46 },
  coverBrand: { color: TAUPE, fontSize: 8.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' },
  coverBrandRule: { backgroundColor: RULE, height: 1, marginTop: 14 },
  // Two equal spacers around the name block float it just above centre, which is where the eye
  // lands first on an A4 page.
  coverSpacer: { flexGrow: 1 },
  coverPreparedFor: { color: TAUPE, fontSize: 8.5, fontWeight: 700, letterSpacing: 1.4, marginBottom: 10, textTransform: 'uppercase' },
  coverName: { fontFamily: 'Times-Roman', fontSize: 46, lineHeight: 1.05, marginBottom: 18 },
  coverRule: { backgroundColor: TAUPE, height: 2, marginBottom: 20, width: 116 },
  coverTitle: { fontFamily: 'Times-Roman', fontSize: 21, lineHeight: 1.2, marginBottom: 8 },
  coverMeta: { color: MUTED, fontSize: 10.5, letterSpacing: 0.4 },
  coverPanel: { backgroundColor: CHAI, marginTop: 30, padding: 16 },
  coverPanelLabel: { color: NAVY, fontSize: 8, fontWeight: 700, letterSpacing: 1.1, marginBottom: 6, textTransform: 'uppercase' },
  coverPanelText: { fontSize: 12, lineHeight: 1.55 },
  coverFooter: { borderTopColor: RULE, borderTopWidth: 1, paddingTop: 14 },
  coverFooterName: { fontSize: 10.5, marginBottom: 3 },
  coverFooterLine: { color: MUTED, fontSize: 8.5, lineHeight: 1.5 },
});

function BulletList({
  items,
  mark,
  checkable = false,
}: {
  items: string[];
  mark: string;
  checkable?: boolean;
}) {
  return (
    <View>
      {items.map((item, index) => (
        <View key={`${index}-${item}`} style={styles.bullet}>
          {checkable
            ? <View style={styles.checkbox} />
            : <Text style={[styles.bulletMark, { color: mark }]}>•</Text>}
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function Entry({
  entry,
  isLast,
}: {
  entry: PlanExportSection['entries'][number];
  isLast: boolean;
}) {
  if (isChaiCalloutHeading(entry.heading) || isAmberCalloutHeading(entry.heading)) {
    const amber = isAmberCalloutHeading(entry.heading);
    return (
      <View>
        <View style={amber ? styles.calloutAmber : styles.calloutChai} wrap={false}>
          <Text style={amber ? styles.calloutHeadingAmber : styles.calloutHeadingChai}>{entry.heading}</Text>
          {entry.body ? <Text style={styles.body}>{entry.body}</Text> : null}
          {entry.items && entry.items.length > 0 ? <BulletList items={entry.items} mark={amber ? '#6D4911' : NAVY} /> : null}
        </View>
        {/* The closing note is the last thing in the plan section, so the trailing space on
            that page becomes somewhere for the client to write. */}
        {entry.heading === CLIENT_NOTE_HEADING && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.heading}>Notes</Text>
            <RuledLines count={6} />
          </View>
        )}
      </View>
    );
  }
  return (
    <View style={isLast ? styles.entryLast : styles.entry} wrap={false}>
      <Text style={styles.heading}>{entry.heading}</Text>
      {entry.body ? <Text style={styles.body}>{entry.body}</Text> : null}
      {entry.items && entry.items.length > 0
        ? <BulletList items={entry.items} mark={TAUPE} checkable={isClientActionHeading(entry.heading)} />
        : null}
    </View>
  );
}

function CoverPage({ cover }: { cover: PlanCover }) {
  return (
    <Page size="A4" style={styles.cover}>
      {cover.isDraft && <Text style={styles.draft}>DRAFT · NOT APPROVED FOR CLIENT DELIVERY</Text>}
      <View>
        <Text style={styles.coverBrand}>Coach Kagiso</Text>
        <View style={styles.coverBrandRule} />
      </View>

      <View style={styles.coverSpacer} />

      <Text style={styles.coverPreparedFor}>Prepared for</Text>
      <Text style={styles.coverName}>{cover.clientName}</Text>
      <View style={styles.coverRule} />
      <Text style={styles.coverTitle}>{cover.documentTitle}</Text>
      <Text style={styles.coverMeta}>
        {[cover.serviceLabel, cover.horizonLabel].filter(Boolean).join(' \u00b7 ')}
      </Text>
      {cover.direction ? (
        <View style={styles.coverPanel} wrap={false}>
          <Text style={styles.coverPanelLabel}>What this plan is for</Text>
          <Text style={styles.coverPanelText}>{cover.direction}</Text>
        </View>
      ) : null}

      <View style={styles.coverSpacer} />

      <View style={styles.coverFooter}>
        <Text style={styles.coverFooterName}>Kagiso Shabangu</Text>
        <Text style={styles.coverFooterLine}>Career Development and Personal Brand Coach</Text>
        <Text style={styles.coverFooterLine}>
          {cover.preparedOn ? `Prepared ${cover.preparedOn} \u00b7 ` : ''}coachkagiso.co.za
        </Text>
      </View>
    </Page>
  );
}

function AtAGlancePage({
  glance,
  isDraft,
  footer,
}: {
  glance: PlanAtAGlance;
  isDraft: boolean;
  footer: ReactElement;
}) {
  return (
    <Page size="A4" style={styles.page}>
      {isDraft && <Text style={styles.draft}>DRAFT · NOT APPROVED FOR CLIENT DELIVERY</Text>}
      <Text style={styles.kicker}>Your plan at a glance</Text>
      <Text style={styles.glanceTitle}>The next {glance.horizonDays} days</Text>
      <View style={styles.glanceRule} />

      <Text style={styles.glanceLabel}>Direction</Text>
      <Text style={styles.glanceLead}>{glance.direction}</Text>

      <Text style={styles.glanceLabel}>What you will have at the end</Text>
      <Text style={styles.glanceBody}>{glance.outcome}</Text>

      <View style={styles.glancePanel} wrap={false}>
        <Text style={styles.glanceLabel}>Every week, without fail</Text>
        <Text style={styles.glancePanelText}>{glance.weeklyCommitment}</Text>
      </View>

      {glance.milestones.length > 0 && (
        <>
          <Text style={styles.glanceLabel}>Milestones</Text>
          {glance.milestones.map((milestone) => (
            <View key={milestone.label} style={styles.glanceRow} wrap={false}>
              <Text style={styles.glanceRowLabel}>{milestone.label}</Text>
              <View style={styles.glanceRowBody}>
                {/* Plain bullets: the tickable copy of these lives in the plan section, and two
                    tick targets for one milestone is worse than none. */}
                <BulletList items={milestone.items} mark={TAUPE} />
              </View>
            </View>
          ))}
        </>
      )}

      {footer}
    </Page>
  );
}

function RuledLines({ count }: { count: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, index) => <View key={index} style={styles.ruledLine} />)}
    </View>
  );
}

function WorksheetPage({
  worksheet,
  isDraft,
  footer,
}: {
  worksheet: PlanWorksheet;
  isDraft: boolean;
  footer: ReactElement;
}) {
  return (
    <Page size="A4" style={styles.page}>
      {isDraft && <Text style={styles.draft}>DRAFT · NOT APPROVED FOR CLIENT DELIVERY</Text>}
      <Text style={styles.kicker}>Weekly worksheet</Text>
      <Text style={styles.glanceTitle}>Your evidence loop</Text>
      <View style={styles.glanceRule} />
      <Text style={styles.sheetIntro}>
        {worksheet.cadence}. Print or copy this page and fill in a fresh one each time.
      </Text>

      <View style={styles.sheetDateRow}>
        <Text style={styles.glanceLabel}>Date</Text>
        <View style={styles.sheetDateLine} />
      </View>

      <Text style={styles.glanceLabel}>What you do each time</Text>
      <BulletList items={worksheet.steps} mark={TAUPE} checkable />

      <View style={{ marginTop: 22 }}>
        <Text style={styles.glanceLabel}>What you ask yourself afterwards</Text>
        <Text style={styles.sheetQuestion}>{worksheet.reflectionPrompt}</Text>
        <RuledLines count={6} />
      </View>

      <View style={{ marginTop: 22 }}>
        <Text style={styles.glanceLabel}>Notes</Text>
        <RuledLines count={8} />
      </View>
      {footer}
    </Page>
  );
}

export default function ClientStrategyPlanPdf({
  plan,
  clientName,
  options,
}: {
  plan: ClientStrategyPlanRecord;
  clientName: string;
  options: ClientStrategyPlanExportOptions;
}) {
  const sections = buildClientStrategyPlanExportSections(plan, options);
  const cover = buildClientStrategyPlanCover({ plan, clientName, options });
  const glance = buildClientStrategyPlanAtAGlance(plan, options);
  const worksheet = buildClientStrategyPlanWorksheet(plan, options);
  const service = plan.serviceSlug === 'glow-up-vip' ? 'Glow Up VIP' : 'Career Clarity';
  const isDraft = plan.status === 'draft';
  const footer = (
    <Text fixed style={styles.footer} render={({ pageNumber, totalPages }) => (
      `${isDraft ? 'Draft · not approved for delivery · ' : ''}${clientName} · Coach Kagiso · Page ${pageNumber} of ${totalPages}`
    )} />
  );
  return (
    <Document author="Coach Kagiso" title={`${clientName} client support pack`}>
      <CoverPage cover={cover} />
      {glance && <AtAGlancePage glance={glance} isDraft={isDraft} footer={footer} />}
      <Page size="A4" style={styles.page} wrap>
        {isDraft && <Text fixed style={styles.draft}>DRAFT · NOT APPROVED FOR CLIENT DELIVERY</Text>}
        <Text style={styles.kicker}>Coach Kagiso · {service}</Text>
        <Text style={styles.title}>{clientName}</Text>
        <Text style={styles.meta}>{isDraft ? 'Working draft' : 'Approved client document'}</Text>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.entries.map((entry, index) => (
              <Entry
                key={`${section.title}-${entry.heading}`}
                entry={entry}
                isLast={index === section.entries.length - 1}
              />
            ))}
          </View>
        ))}
        {footer}
      </Page>
      {worksheet && <WorksheetPage worksheet={worksheet} isDraft={isDraft} footer={footer} />}
    </Document>
  );
}
