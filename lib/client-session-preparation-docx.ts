import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import type { ClientSessionPreparationRecord } from '@/lib/client-session-preparation';
import type { SessionPreparationExportOptions } from '@/lib/client-session-preparation-export';

const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const NAVY = '142334';
const MUTED = '66717C';
const TAUPE = '8C7466';
const RULE = 'D8C8BB';
const AMBER = 'FFF1CC';

type DocxContext = {
  compact: boolean;
};

function kicker(text: string) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, color: TAUPE, size: 16, characterSpacing: 28 })],
  });
}

function title(text: string, context: DocxContext) {
  return new Paragraph({
    keepNext: true,
    spacing: { after: context.compact ? 120 : 180 },
    children: [new TextRun({ text, bold: true, color: NAVY, font: 'Georgia', size: context.compact ? 38 : 44 })],
  });
}

function sectionHeading(text: string, context: DocxContext) {
  return new Paragraph({
    keepNext: true,
    spacing: { before: context.compact ? 130 : 180, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 4 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, color: TAUPE, size: context.compact ? 16 : 17, characterSpacing: 24 })],
  });
}

function body(text: string, context: DocxContext, options: { color?: string; bold?: boolean; after?: number } = {}) {
  return new Paragraph({
    spacing: { after: options.after ?? (context.compact ? 70 : 100), line: context.compact ? 260 : 290, lineRule: 'auto' },
    children: [new TextRun({ text, bold: options.bold, color: options.color || NAVY, size: context.compact ? 18 : 20 })],
  });
}

function bullet(text: string, context: DocxContext) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: context.compact ? 45 : 70, line: context.compact ? 250 : 280, lineRule: 'auto' },
    children: [new TextRun({ text, color: NAVY, size: context.compact ? 18 : 20 })],
  });
}

function stageParagraphs(preparation: ClientSessionPreparationRecord, context: DocxContext, includeCues: boolean) {
  return preparation.content.conversationFlow.flatMap((step, index) => {
    const timing = step.startMinute === null || step.endMinute === null
      ? `Stage ${index + 1}`
      : `${step.startMinute}-${step.endMinute} min`;
    const tags = [
      step.priority ? step.priority.replace('_', ' ') : '',
      ...step.deliverables,
    ].filter(Boolean);
    const paragraphs = [
      new Paragraph({
        keepNext: true,
        spacing: { before: context.compact ? 70 : 100, after: 35 },
        children: [
          new TextRun({ text: `${timing.toUpperCase()}  `, bold: true, color: TAUPE, size: 16 }),
          new TextRun({ text: step.stage, bold: true, color: NAVY, font: 'Georgia', size: context.compact ? 22 : 24 }),
        ],
      }),
      body(step.purpose, context, { color: '42505E', after: 40 }),
    ];
    if (tags.length > 0) paragraphs.push(body(`Priority / deliverables: ${tags.join(' | ')}`, context, { color: MUTED, after: 35 }));
    if (includeCues) {
      step.listenFor.forEach((cue) => paragraphs.push(body(`Listen for: ${cue}`, context, { color: '6B5A50', after: 35 })));
    }
    return paragraphs;
  });
}

function questionsAndClose(preparation: ClientSessionPreparationRecord, context: DocxContext, includeCues: boolean) {
  const children: Paragraph[] = [sectionHeading('Priority questions', context)];
  preparation.content.priorityQuestions.forEach((question, index) => {
    const priority = question.priority === 'must_ask' ? 'MUST ASK - ' : question.priority === 'if_time' ? 'IF TIME - ' : '';
    children.push(
      new Paragraph({
        keepNext: true,
        spacing: { before: context.compact ? 65 : 90, after: 35 },
        children: [
          new TextRun({ text: `${String(index + 1).padStart(2, '0')}  `, color: TAUPE, font: 'Georgia', size: 22 }),
          new TextRun({ text: `${priority}${question.question}`, bold: true, color: NAVY, size: context.compact ? 18 : 20 }),
        ],
      }),
      body(question.whyItMatters, context, { color: MUTED, after: 45 }),
    );
  });
  if (includeCues && preparation.content.legacyListenFor.length > 0) {
    children.push(sectionHeading('General notes for this session', context));
    preparation.content.legacyListenFor.forEach((item) => children.push(bullet(item, context)));
  }
  children.push(sectionHeading('Close with', context));
  preparation.content.closeWith.forEach((item) => children.push(bullet(item, context)));
  return children;
}

function coachingLens(preparation: ClientSessionPreparationRecord, context: DocxContext) {
  const children: Paragraph[] = [
    new Paragraph({
      shading: { fill: NAVY },
      spacing: { after: 150 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: 'PRIVATE COACHING PREPARATION - NOT FOR CLIENT DISTRIBUTION',
        bold: true,
        color: 'FFFFFF',
        size: 16,
        characterSpacing: 20,
      })],
    }),
    kicker('Coaching lens'),
    title('Context to review before the conversation.', context),
  ];
  const grouped = Object.entries(
    preparation.content.groundedCoachNotes.reduce<Record<string, string[]>>((result, note) => {
      (result[note.source] ||= []).push(note.note);
      return result;
    }, {}),
  );
  if (grouped.length > 0) {
    children.push(sectionHeading('Grounded notes', context));
    for (const [source, notes] of grouped) {
      const label = source === 'cv_analysis' ? 'CV analysis' : source === 'earlier_diagnostic' ? 'Earlier diagnostic' : 'Intake';
      children.push(body(label.toUpperCase(), context, { color: TAUPE, bold: true, after: 40 }));
      notes.forEach((note) => children.push(bullet(note, context)));
    }
  }
  if (preparation.content.judgmentCalls.length > 0) {
    children.push(
      new Paragraph({
        keepNext: true,
        shading: { fill: AMBER },
        spacing: { before: 140, after: 60 },
        children: [new TextRun({ text: 'HYPOTHESIS - VERIFY WITH CLIENT', bold: true, color: '6D4911', size: 16 })],
      }),
    );
    preparation.content.judgmentCalls.forEach((item) => children.push(bullet(item, context)));
  }
  if (preparation.content.legacyCoachNotes.length > 0) {
    children.push(sectionHeading('Legacy coach notes - source not classified', context));
    children.push(body('These notes predate source separation. Verify them before relying on them.', context, { color: MUTED }));
    preparation.content.legacyCoachNotes.forEach((item) => children.push(bullet(item, context)));
  }
  return children;
}

export async function buildSessionPreparationDocx(input: {
  preparation: ClientSessionPreparationRecord;
  clientName: string;
  options: SessionPreparationExportOptions;
}) {
  const context = { compact: input.options.layout === 'compact' };
  const service = input.preparation.serviceSlug === 'career-clarity' ? 'Career Clarity' : 'Glow Up VIP';
  const children: Paragraph[] = [];

  if (input.options.includeGuide) {
    children.push(
      kicker('Session preparation'),
      title(input.preparation.content.sessionFocus, context),
      body(`${input.clientName || 'Client'} | ${service} | 60 min | Microsoft Teams`, context, { color: MUTED }),
      body(input.preparation.content.openingFrame, context, { color: '42505E', after: 100 }),
    );
    if (input.preparation.content.urgencyNote) {
      children.push(new Paragraph({
        shading: { fill: AMBER },
        spacing: { after: 110 },
        children: [new TextRun({ text: input.preparation.content.urgencyNote, color: '6D4911', size: context.compact ? 18 : 20 })],
      }));
    }
    children.push(
      sectionHeading(input.preparation.content.format === 'timed_v3' ? 'Timed conversation flow' : 'Conversation flow', context),
      ...stageParagraphs(input.preparation, context, context.compact && input.options.includeCues),
      new Paragraph({ children: [new PageBreak()] }),
      kicker('Session guide - continued'),
      ...questionsAndClose(input.preparation, context, input.options.includeCues && !context.compact),
    );
  }

  if (input.options.includeLens) {
    if (!context.compact || !input.options.includeGuide) {
      if (children.length > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
    } else {
      children.push(sectionHeading('Private coaching lens', context));
    }
    children.push(...coachingLens(input.preparation, context));
  }

  const document = new Document({
    creator: 'Coach Kagiso',
    description: 'Private coaching session preparation',
    title: `${input.clientName || 'Client'} session preparation`,
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: context.compact ? 18 : 20, color: NAVY },
          paragraph: { spacing: { after: context.compact ? 70 : 100, line: context.compact ? 260 : 290, lineRule: 'auto' } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
          margin: {
            top: context.compact ? 600 : 720,
            right: context.compact ? 600 : 720,
            bottom: context.compact ? 650 : 720,
            left: context.compact ? 600 : 720,
          },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({ text: 'COACH KAGISO | SESSION PREPARATION', bold: true, color: TAUPE, size: 14, characterSpacing: 18 })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: input.options.includeLens ? 'Private coaching preparation - not for client distribution | Page ' : 'Session preparation | Page ',
                color: MUTED,
                size: 14,
              }),
              new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 14 }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  return Buffer.from(await Packer.toBuffer(document));
}
