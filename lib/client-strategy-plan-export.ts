import type {
  ClientStrategyPlanContent,
  ClientStrategyPlanRecord,
} from '@/lib/client-strategy-plan';
// Explicit .ts extension so the node --experimental-strip-types test runner can resolve it.
import { groupClientStrategyPlanWeeks } from './client-strategy-plan.ts';
// Explicit .ts extension so the node --experimental-strip-types test runner can resolve it.
import { stripEmphasis } from './report-emphasis.ts';

export type ClientStrategyPlanExportFormat = 'pdf' | 'docx';

export type ClientStrategyPlanExportOptions = {
  format: ClientStrategyPlanExportFormat;
  includeSessionSummary: boolean;
  includeDevelopmentPlan: boolean;
  includeInterviewPrep: boolean;
};

export type PlanExportSection = {
  title: string;
  entries: Array<{
    heading: string;
    body?: string;
    items?: string[];
  }>;
};

/**
 * The opening page: the handful of fields every plan always has exactly one of, so a fixed
 * layout is safe here in a way it would not be for the variable-length sections below.
 */
export type PlanAtAGlance = {
  horizonDays: number;
  direction: string;
  outcome: string;
  weeklyCommitment: string;
  milestones: Array<{ label: string; items: string[] }>;
};

/**
 * Entries lifted into a tinted panel so the decision points survive a skim. Kept here rather
 * than in each renderer so the PDF and the DOCX cannot disagree about what gets emphasised.
 */
const CHAI_CALLOUT_HEADINGS = new Set(['Agreed outcome', 'Outcome', 'Checkpoint condition']);

export const CLIENT_NOTE_HEADING = 'A note for you';

export function isChaiCalloutHeading(heading: string) {
  return CHAI_CALLOUT_HEADINGS.has(heading);
}

export function isAmberCalloutHeading(heading: string) {
  return heading === CLIENT_NOTE_HEADING;
}

/**
 * Item lists the client is meant to tick off, which render with a checkbox instead of a bullet.
 * Kagiso's own commitments are deliberately excluded: they are not the client's to complete.
 */
export function isClientActionHeading(heading: string) {
  if (/kagiso/i.test(heading)) return false;
  // 'What you do each time' is deliberately absent: the ritual's tickable copy lives on the
  // weekly worksheet page, which renders under exactly the same conditions as that entry.
  return heading === 'What you agreed to do'
    || heading.endsWith('· Actions')
    || /^By Day \d+$/.test(heading)
    || /^Week \d+ · /.test(heading);
}

/** The repeating ritual, rendered as a worksheet the client fills in once per cycle. */
export type PlanWorksheet = {
  cadence: string;
  steps: string[];
  reflectionPrompt: string;
};

export function buildClientStrategyPlanWorksheet(
  plan: ClientStrategyPlanRecord,
  options: ClientStrategyPlanExportOptions,
): PlanWorksheet | null {
  if (!options.includeDevelopmentPlan) return null;
  const content = plan.editedContent;
  if (content.kind !== 'career_clarity_development_plan' || !content.marketSignalRitual) return null;
  const ritual = content.marketSignalRitual;
  return {
    cadence: stripEmphasis(ritual.cadence),
    steps: ritual.steps.map(stripEmphasis),
    reflectionPrompt: stripEmphasis(ritual.reflectionPrompt),
  };
}

export function buildClientStrategyPlanAtAGlance(
  plan: ClientStrategyPlanRecord,
  options: ClientStrategyPlanExportOptions,
): PlanAtAGlance | null {
  if (!options.includeDevelopmentPlan) return null;
  const content = plan.editedContent;
  const milestones = [
    { label: 'Day 30', items: content.milestones.day30 || [] },
    ...(content.planHorizonDays >= 60 ? [{ label: 'Day 60', items: content.milestones.day60 || [] }] : []),
    ...(content.planHorizonDays >= 90 ? [{ label: 'Day 90', items: content.milestones.day90 || [] }] : []),
  ].filter((milestone) => milestone.items.length > 0);
  return {
    horizonDays: content.planHorizonDays,
    direction: stripEmphasis(content.focusStatement),
    outcome: stripEmphasis(content.outcome),
    weeklyCommitment: stripEmphasis(content.minimumViableCommitment),
    milestones: milestones.map((milestone) => ({
      label: milestone.label,
      items: milestone.items.map(stripEmphasis),
    })),
  };
}

/**
 * The cover exists so the pack opens with the client's own name rather than a section heading.
 * Built here rather than in each renderer so the PDF and the DOCX cannot drift on what the
 * document calls itself.
 */
export type PlanCover = {
  clientName: string;
  documentTitle: string;
  serviceLabel: string;
  horizonLabel: string | null;
  preparedOn: string | null;
  direction: string | null;
  isDraft: boolean;
};

/** Long-form South African date, for example 18 August 2026. Never a bare ISO string. */
function formatPreparedOn(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(date);
}

export function buildClientStrategyPlanCover(input: {
  plan: ClientStrategyPlanRecord;
  clientName: string;
  options: ClientStrategyPlanExportOptions;
}): PlanCover {
  const content = input.plan.editedContent;
  // The pack is named after the section a client actually opens it for, so a summary-only
  // export is not handed to them under a plan title it does not contain.
  const documentTitle = input.options.includeDevelopmentPlan
    ? 'Career Development Plan'
    : input.options.includeSessionSummary
      ? 'Session Summary & Agreements'
      : 'Interview Preparation';
  return {
    clientName: input.clientName,
    documentTitle,
    serviceLabel: input.plan.serviceSlug === 'glow-up-vip' ? 'Glow Up VIP' : 'Career Clarity',
    horizonLabel: input.options.includeDevelopmentPlan ? `${content.planHorizonDays} days` : null,
    preparedOn: formatPreparedOn(input.plan.approvedAt || input.plan.generatedAt || null),
    // The focus statement is the one line that proves the pack was written for this person,
    // which is exactly what a cover has to establish.
    direction: input.options.includeDevelopmentPlan ? stripEmphasis(content.focusStatement) : null,
    isDraft: input.plan.status === 'draft',
  };
}

export const DEFAULT_CLIENT_STRATEGY_PLAN_EXPORT_OPTIONS: ClientStrategyPlanExportOptions = {
  format: 'pdf',
  includeSessionSummary: true,
  includeDevelopmentPlan: true,
  includeInterviewPrep: true,
};

export function clientStrategyPlanExportFileName(input: {
  clientName: string;
  serviceSlug: string;
  version: number;
  extension: ClientStrategyPlanExportFormat;
}) {
  const safeName = input.clientName.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'client';
  const service = input.serviceSlug === 'glow-up-vip' ? 'glow-up-vip' : 'career-clarity';
  return `${safeName}-${service}-client-pack-v${input.version}.${input.extension}`.toLowerCase();
}

export function buildClientStrategyPlanExportSections(
  plan: ClientStrategyPlanRecord,
  options: ClientStrategyPlanExportOptions,
): PlanExportSection[] {
  const content = plan.editedContent;
  const sections: PlanExportSection[] = [];
  if (options.includeSessionSummary) {
    const summary = content.sessionSummary;
    sections.push({
      title: 'Session Summary & Agreements',
      entries: [
        { heading: 'Session date', body: summary.sessionDate },
        { heading: 'Why we met', body: summary.purpose },
        { heading: 'Where you were when we started', body: summary.whereThingsStood },
        { heading: 'What we explored', items: summary.themesExplored },
        { heading: 'What became clearer', items: summary.clarityGained },
        { heading: 'Agreed outcome', body: summary.agreedOutcome },
        { heading: 'What you agreed to do', items: summary.clientCommitments },
        { heading: 'What Kagiso agreed to do', items: summary.coachCommitments },
        { heading: 'Still open', items: summary.openPoints },
      ],
    });
  }
  if (options.includeDevelopmentPlan) {
    const phaseEntries = content.kind === 'career_clarity_development_plan'
      ? [
          ['Days 1 to 3', content.days1To3],
          ['Days 4 to 7', content.days4To7],
          ['Days 8 to 14', content.days8To14],
        ] as const
      : [
          ['Days 1 to 7', content.days1To7],
          ['Days 8 to 14', content.days8To14],
          ['Days 15 to 21', content.days15To21],
          ['Days 22 to 30', content.days22To30],
        ] as const;
    const milestoneEntries = [
      { heading: 'By Day 30', items: content.milestones.day30 },
      ...(content.planHorizonDays >= 60 ? [{ heading: 'By Day 60', items: content.milestones.day60 || [] }] : []),
      ...(content.planHorizonDays >= 90 ? [{ heading: 'By Day 90', items: content.milestones.day90 || [] }] : []),
    ];
    sections.push({
      title: `Career Development Plan · ${content.planHorizonDays} days`,
      entries: [
        { heading: 'Direction', body: content.focusStatement },
        { heading: 'Outcome', body: content.outcome },
        { heading: 'Every week, without fail', body: content.minimumViableCommitment },
        ...phaseEntries.flatMap(([label, phase]) => [
          { heading: `${label} · Focus`, body: phase.focus },
          { heading: `${label} · Actions`, items: phase.actions },
          ...('coachSupport' in phase ? [{ heading: `${label} · Kagiso support`, items: phase.coachSupport }] : []),
        ]),
        ...milestoneEntries,
        { heading: 'Checkpoint condition', body: content.checkpointCondition },
        ...(content.kind === 'career_clarity_development_plan'
          ? [
              { heading: 'Questions for your check-in', items: content.checkInQuestions },
              { heading: 'How Kagiso will support you', items: content.coachFollowUp },
            ]
          : [{ heading: 'Progress signals', items: content.progressSignals }]),
        { heading: CLIENT_NOTE_HEADING, body: content.permissionLine },
      ],
    });

    if (content.kind === 'career_clarity_development_plan') {
      if (content.decisionFramework) {
        const framework = content.decisionFramework;
        sections.push({
          title: 'Making Your Decision',
          entries: [
            { heading: 'The decision you are making', body: framework.decisionStatement },
            ...framework.criteria.flatMap((criterion, index) => [
              { heading: `Criterion ${index + 1} · ${criterion.criterion}`, items: [
                `Test it in your current role: ${criterion.currentRoleEvidence}`,
                `Test it in the market: ${criterion.marketEvidence}`,
              ] },
            ]),
            { heading: 'What would make staying the right call for you', body: framework.stayThreshold },
            { heading: 'When you make the call', body: framework.decisionCheckpoint },
          ],
        });
      }

      if (content.positioning) {
        const positioning = content.positioning;
        sections.push({
          title: 'How You Present Your Value',
          entries: [
            { heading: 'How a recruiter reads you today', body: positioning.currentRecruiterRead },
            { heading: 'How you want to be read', body: positioning.targetRecruiterRead },
            { heading: 'Your positioning statement', body: positioning.positioningStatement },
            { heading: 'Questions that pull out your evidence', items: positioning.achievementPrompts },
          ],
        });
      }

      if (content.weeklyRhythm.length > 0) {
        // One section per milestone stretch, so the plan reads as an arc toward Day 30, 60 and 90
        // rather than a flat run of weeks. Emitting separate sections means the PDF and DOCX
        // renderers pick the grouping up without changes.
        for (const block of groupClientStrategyPlanWeeks(content.weeklyRhythm, content.planHorizonDays)) {
          sections.push({
            title: `Weeks ${block.fromWeek} to ${block.toWeek} · Working Toward Day ${block.milestoneDay}`,
            entries: block.weeks.map((week) => ({
              heading: `Week ${week.weekNumber} · ${week.theme}`,
              items: week.actions,
            })),
          });
        }
      }

      if (content.marketSignalRitual || content.progressSignals.length > 0) {
        const ritual = content.marketSignalRitual;
        sections.push({
          title: 'Your Weekly Evidence Loop',
          entries: [
            ...(ritual
              ? [
                  { heading: 'How often', body: ritual.cadence },
                  { heading: 'What you do each time', items: ritual.steps },
                  { heading: 'What you ask yourself afterwards', body: ritual.reflectionPrompt },
                ]
              : []),
            ...(content.progressSignals.length > 0
              ? [{ heading: 'Signs it is working for you', items: content.progressSignals }]
              : []),
          ],
        });
      }
    }
  }
  if (
    options.includeInterviewPrep
    && content.kind === 'glow_up_development_plan'
    && content.interviewPrep
  ) {
    const prep = content.interviewPrep;
    sections.push({
      title: 'Interview Preparation',
      entries: [
        { heading: 'Questions you are likely to be asked', items: prep.likelyQuestions },
        { heading: `Worked STAR example · ${prep.starExample.title}`, body: [
          `Situation: ${prep.starExample.situation}`,
          `Task: ${prep.starExample.task}`,
          `Action: ${prep.starExample.action}`,
          `Result: ${prep.starExample.result}`,
        ].join('\n') },
        { heading: 'Stories for you to prepare', items: prep.storyPrompts.map((story) => `${story.experience}: ${story.prompt}`) },
        { heading: 'What to research before the interview', items: prep.researchChecklist },
        { heading: 'What to watch out for', body: `${prep.watchOutFor.risk}\nHow to handle it: ${prep.watchOutFor.handling}` },
      ],
    });
  }
  // PDF and DOCX are plain-text destinations, so the on-screen bold marks are removed here
  // rather than in each renderer.
  return sections.map((section) => ({
    ...section,
    entries: section.entries.map((entry) => ({
      ...entry,
      body: entry.body ? stripEmphasis(entry.body) : entry.body,
      items: entry.items?.map(stripEmphasis),
    })),
  }));
}

/** Which sections this plan actually has, and can therefore be exported. */
export function getClientStrategyPlanExportAvailability(content: ClientStrategyPlanContent) {
  return {
    includeSessionSummary: content.sectionStatus.sessionSummary === 'generated',
    includeDevelopmentPlan: content.sectionStatus.developmentPlan === 'generated',
    includeInterviewPrep: content.kind === 'glow_up_development_plan'
      && content.sectionStatus.interviewPrep === 'generated'
      && Boolean(content.interviewPrep),
  };
}

/**
 * Clears any section the plan does not have. The picker shows those unchecked, so the request
 * has to match: sending one anyway makes validateClientStrategyPlanExport reject the whole
 * export over a section the user never asked for.
 */
export function resolveClientStrategyPlanExportOptions(
  content: ClientStrategyPlanContent,
  options: ClientStrategyPlanExportOptions,
): ClientStrategyPlanExportOptions {
  const availability = getClientStrategyPlanExportAvailability(content);
  return {
    ...options,
    includeSessionSummary: availability.includeSessionSummary && options.includeSessionSummary,
    includeDevelopmentPlan: availability.includeDevelopmentPlan && options.includeDevelopmentPlan,
    includeInterviewPrep: availability.includeInterviewPrep && options.includeInterviewPrep,
  };
}

export function validateClientStrategyPlanExport(
  content: ClientStrategyPlanContent,
  options: ClientStrategyPlanExportOptions,
) {
  if (!options.includeSessionSummary && !options.includeDevelopmentPlan && !options.includeInterviewPrep) {
    throw new Error('Choose at least one section to export.');
  }
  if (options.includeSessionSummary && content.sectionStatus.sessionSummary !== 'generated') {
    throw new Error('Generate the Session Summary before exporting it.');
  }
  if (options.includeDevelopmentPlan && content.sectionStatus.developmentPlan !== 'generated') {
    throw new Error('Generate the Career Development Plan before exporting it.');
  }
  if (options.includeInterviewPrep && content.kind !== 'glow_up_development_plan') {
    throw new Error('Interview Preparation is available only for Glow Up VIP.');
  }
  if (
    options.includeInterviewPrep
    && content.kind === 'glow_up_development_plan'
    && (!content.interviewPrep || content.sectionStatus.interviewPrep !== 'generated')
  ) {
    throw new Error('Generate Interview Preparation before exporting it.');
  }
}
