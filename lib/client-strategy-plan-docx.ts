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
import type { ClientStrategyPlanRecord } from './client-strategy-plan';
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
} from './client-strategy-plan-export';

const NAVY = '142334';
const TAUPE = '8C7466';
const MUTED = '66717C';
const RULE = 'D8C8BB';
const CHAI = 'E4D8CB';
const AMBER_FILL = 'FFF1CC';
const AMBER_TEXT = '6D4911';

// U+2610 BALLOT BOX. Word has no drawable box inside a run, so the tickable lists carry the
// glyph in the text instead of a bullet.
const CHECKBOX = '☐';

// 24pt clears a line of handwriting; anything tighter and the sheet cannot actually be used.
function ruledLines(count: number) {
  return Array.from({ length: count }, () => new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 2 } },
    spacing: { before: 240, after: 0 },
    children: [new TextRun({ text: '', size: 21 })],
  }));
}

function glanceLabel(text: string) {
  return new Paragraph({
    keepNext: true,
    spacing: { before: 120, after: 60 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, color: TAUPE, size: 16, characterSpacing: 16 })],
  });
}

export async function buildClientStrategyPlanDocx(input: {
  plan: ClientStrategyPlanRecord;
  clientName: string;
  options: ClientStrategyPlanExportOptions;
}) {
  const service = input.plan.serviceSlug === 'glow-up-vip' ? 'Glow Up VIP' : 'Career Clarity';
  const isDraft = input.plan.status === 'draft';
  const children: Paragraph[] = [];
  if (isDraft) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      shading: { fill: 'FFF1CC' },
      spacing: { after: 200 },
      children: [new TextRun({ text: 'DRAFT · NOT APPROVED FOR CLIENT DELIVERY', bold: true, color: '6D4911', size: 18 })],
    }));
  }
  const cover = buildClientStrategyPlanCover({
    plan: input.plan,
    clientName: input.clientName,
    options: input.options,
  });
  // Word has no vertical centring inside a section, so the cover is spaced by hand: a large
  // gap above the name block and another above the sign-off puts them where the PDF has them.
  children.push(
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 10 } },
      spacing: { after: 2600 },
      children: [new TextRun({ text: 'COACH KAGISO', bold: true, color: TAUPE, size: 17, characterSpacing: 40 })],
    }),
    new Paragraph({ keepNext: true, spacing: { after: 90 }, children: [new TextRun({ text: 'PREPARED FOR', bold: true, color: TAUPE, size: 16, characterSpacing: 28 })] }),
    new Paragraph({
      keepNext: true,
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TAUPE, space: 14 } },
      spacing: { after: 300 },
      children: [new TextRun({ text: cover.clientName, bold: true, color: NAVY, font: 'Georgia', size: 84 })],
    }),
    new Paragraph({ keepNext: true, spacing: { after: 80 }, children: [new TextRun({ text: cover.documentTitle, bold: true, color: NAVY, font: 'Georgia', size: 38 })] }),
    new Paragraph({
      spacing: { after: 320 },
      children: [new TextRun({ text: [cover.serviceLabel, cover.horizonLabel].filter(Boolean).join(' · '), color: MUTED, size: 21 })],
    }),
  );
  if (cover.direction) {
    children.push(
      new Paragraph({
        keepNext: true,
        shading: { fill: CHAI },
        spacing: { before: 60, after: 40 },
        children: [new TextRun({ text: 'WHAT THIS PLAN IS FOR', bold: true, color: NAVY, size: 16, characterSpacing: 16 })],
      }),
      new Paragraph({
        shading: { fill: CHAI },
        spacing: { after: 100, line: 300, lineRule: 'auto' },
        children: [new TextRun({ text: cover.direction, color: NAVY, size: 24 })],
      }),
    );
  }
  children.push(
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 14 } },
      spacing: { before: 2400, after: 40 },
      children: [new TextRun({ text: 'Kagiso Shabangu', color: NAVY, size: 21 })],
    }),
    new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: 'Career Development and Personal Brand Coach', color: MUTED, size: 17 })] }),
    new Paragraph({
      children: [new TextRun({
        text: `${cover.preparedOn ? `Prepared ${cover.preparedOn} · ` : ''}coachkagiso.co.za`,
        color: MUTED,
        size: 17,
      })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
    // The cover carries the name and the service, so the content pages open on the work itself.
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: `COACH KAGISO · ${service.toUpperCase()}`, bold: true, color: TAUPE, size: 16, characterSpacing: 24 })] }),
    new Paragraph({ keepNext: true, spacing: { after: 100 }, children: [new TextRun({ text: input.clientName, bold: true, color: NAVY, font: 'Georgia', size: 50 })] }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 8 } },
      spacing: { after: 260 },
      children: [new TextRun({ text: isDraft ? 'Working draft' : 'Approved client document', color: MUTED, size: 19 })],
    }),
  );
  const glance = buildClientStrategyPlanAtAGlance(input.plan, input.options);
  if (glance) {
    children.push(
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: 'YOUR PLAN AT A GLANCE', bold: true, color: TAUPE, size: 16, characterSpacing: 24 })] }),
      new Paragraph({
        keepNext: true,
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TAUPE, space: 10 } },
        spacing: { after: 300 },
        children: [new TextRun({ text: `The next ${glance.horizonDays} days`, bold: true, color: NAVY, font: 'Georgia', size: 44 })],
      }),
      glanceLabel('Direction'),
      new Paragraph({ spacing: { after: 240, line: 300, lineRule: 'auto' }, children: [new TextRun({ text: glance.direction, color: NAVY, size: 25 })] }),
      glanceLabel('What you will have at the end'),
      new Paragraph({ spacing: { after: 280, line: 300, lineRule: 'auto' }, children: [new TextRun({ text: glance.outcome, color: NAVY, size: 21 })] }),
      new Paragraph({
        keepNext: true,
        shading: { fill: CHAI },
        spacing: { before: 60, after: 40 },
        children: [new TextRun({ text: 'EVERY WEEK, WITHOUT FAIL', bold: true, color: NAVY, size: 16, characterSpacing: 16 })],
      }),
      new Paragraph({
        shading: { fill: CHAI },
        spacing: { after: 300, line: 300, lineRule: 'auto' },
        children: [new TextRun({ text: glance.weeklyCommitment, color: NAVY, size: 24 })],
      }),
    );
    for (const milestone of glance.milestones) {
      children.push(glanceLabel(milestone.label));
      for (const item of milestone.items) {
        // Plain bullets: the tickable copy of these lives in the plan section, and two tick
        // targets for one milestone is worse than none.
        children.push(new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 70, line: 280, lineRule: 'auto' },
          children: [new TextRun({ text: item, color: NAVY, size: 21 })],
        }));
      }
    }
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }
  for (const section of buildClientStrategyPlanExportSections(input.plan, input.options)) {
    children.push(new Paragraph({
      keepNext: true,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 4 } },
      spacing: { before: 220, after: 120 },
      children: [new TextRun({ text: section.title, bold: true, color: NAVY, font: 'Georgia', size: 32 })],
    }));
    for (const entry of section.entries) {
      const isChai = isChaiCalloutHeading(entry.heading);
      const isAmber = isAmberCalloutHeading(entry.heading);
      const isCallout = isChai || isAmber;
      const fill = isAmber ? AMBER_FILL : CHAI;
      const headingColor = isAmber ? AMBER_TEXT : isChai ? NAVY : TAUPE;
      children.push(new Paragraph({
        keepNext: true,
        shading: isCallout ? { fill } : undefined,
        border: !isCallout ? { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'EFE9E3', space: 6 } } : undefined,
        spacing: { before: 120, after: 50 },
        children: [new TextRun({ text: entry.heading.toUpperCase(), bold: true, color: headingColor, size: 16, characterSpacing: 16 })],
      }));
      if (entry.body) {
        const lines = entry.body.split('\n');
        lines.forEach((line, index) => {
          children.push(new Paragraph({
            shading: isCallout ? { fill } : undefined,
            border: !isCallout && index === lines.length - 1 && !(entry.items && entry.items.length > 0)
              ? { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'EFE9E3', space: 6 } }
              : undefined,
            spacing: { after: 80, line: 290, lineRule: 'auto' },
            children: [new TextRun({ text: line, color: isCallout ? headingColor : NAVY, size: 21 })],
          }));
        });
      }
      const checkable = isClientActionHeading(entry.heading);
      (entry.items || []).forEach((item, index, items) => {
        children.push(new Paragraph({
          bullet: !checkable ? { level: 0 } : undefined,
          indent: checkable ? { left: 260 } : undefined,
          shading: isCallout ? { fill } : undefined,
          border: !isCallout && index === items.length - 1
            ? { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'EFE9E3', space: 6 } }
            : undefined,
          spacing: { after: 70, line: 280, lineRule: 'auto' },
          children: [new TextRun({
            text: checkable ? `${CHECKBOX}  ${item}` : item,
            color: isCallout ? headingColor : NAVY,
            size: 21,
          })],
        }));
      });
      if (entry.heading === CLIENT_NOTE_HEADING) {
        children.push(glanceLabel('Notes'), ...ruledLines(6));
      }
    }
  }
  const worksheet = buildClientStrategyPlanWorksheet(input.plan, input.options);
  if (worksheet) {
    children.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: 'WEEKLY WORKSHEET', bold: true, color: TAUPE, size: 16, characterSpacing: 24 })] }),
      new Paragraph({
        keepNext: true,
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TAUPE, space: 10 } },
        spacing: { after: 260 },
        children: [new TextRun({ text: 'Your evidence loop', bold: true, color: NAVY, font: 'Georgia', size: 44 })],
      }),
      new Paragraph({
        spacing: { after: 280, line: 290, lineRule: 'auto' },
        children: [new TextRun({ text: `${worksheet.cadence}. Print or copy this page and fill in a fresh one each time.`, color: MUTED, size: 20 })],
      }),
      glanceLabel('Date'),
      ...ruledLines(1),
      glanceLabel('What you do each time'),
    );
    for (const step of worksheet.steps) {
      children.push(new Paragraph({
        indent: { left: 260 },
        spacing: { after: 70, line: 280, lineRule: 'auto' },
        children: [new TextRun({ text: `${CHECKBOX}  ${step}`, color: NAVY, size: 21 })],
      }));
    }
    children.push(
      glanceLabel('What you ask yourself afterwards'),
      new Paragraph({ spacing: { after: 40, line: 290, lineRule: 'auto' }, children: [new TextRun({ text: worksheet.reflectionPrompt, color: NAVY, size: 22 })] }),
      ...ruledLines(6),
      glanceLabel('Notes'),
      ...ruledLines(8),
    );
  }
  const document = new Document({
    creator: 'Coach Kagiso',
    title: `${input.clientName} client support pack`,
    description: `${service} client support pack`,
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 21, color: NAVY },
          paragraph: { spacing: { after: 100, line: 290, lineRule: 'auto' } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 900, right: 900, bottom: 900, left: 900, header: 420, footer: 420 },
        },
      },
      headers: {
        default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: 'COACH KAGISO', bold: true, color: TAUPE, size: 14, characterSpacing: 18 })] })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `${isDraft ? 'Draft · not approved for delivery · ' : ''}${input.clientName} · Page `, color: MUTED, size: 14 }),
            new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 14 }),
          ],
        })] }),
      },
      children,
    }],
  });
  return Buffer.from(await Packer.toBuffer(document));
}
