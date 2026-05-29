import { NextResponse } from 'next/server';
import { addClientToBrevoList, sendTransactionalEmail } from '@/lib/brevo';
import { archetypes as diagnosticArchetypes } from '@/lib/career-diagnostic';
import { getCanonicalDiagnosticArchetypeName } from '@/lib/diagnostic-archetype-names';
import { getContactEmail } from '@/lib/env';
import { getSastDateKey } from '@/lib/follow-up-utils';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'] as const;
const QUESTION_COUNT = 10;

type OptionKey = (typeof OPTION_KEYS)[number];

type DiagnosticPayload = {
  firstName?: string;
  email?: string;
  answers?: Record<string, OptionKey>;
  score?: Record<OptionKey, number>;
  archetype?: {
    key?: OptionKey;
    name?: string;
    tagline?: string;
    diagnosis?: string;
    action?: string;
    actionPlanTitle?: string;
    actionPlan?: string[];
    avoidThis?: string;
    service?: string;
    href?: string;
  };
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidOption(value: unknown): value is OptionKey {
  return typeof value === 'string' && OPTION_KEYS.includes(value as OptionKey);
}

function plainResultEmail(firstName: string, archetype: NonNullable<DiagnosticPayload['archetype']>) {
  const name = archetype.name || 'your career archetype';
  const actionPlan = Array.isArray(archetype.actionPlan) ? archetype.actionPlan.filter(Boolean) : [];
  const playbookSlug = archetype.key ? diagnosticArchetypes[archetype.key]?.playbook.slug : null;
  const playbookUrl = playbookSlug
    ? `https://coachkagiso.co.za/resources/career-diagnostic/playbooks/${playbookSlug}`
    : 'https://coachkagiso.co.za/resources/career-diagnostic';
  const pdfUrl = playbookSlug
    ? `https://coachkagiso.co.za/api/diagnostic/playbook-pdf/${playbookSlug}`
    : 'https://coachkagiso.co.za/resources/career-diagnostic';
  return `Hi ${firstName},

Your 5-Minute Career Diagnostic result is: ${name}.

${archetype.tagline || ''}

What this points to:
${archetype.diagnosis || 'Your result points to a specific career season that deserves a clearer next step.'}

Your next 7 days:
${archetype.action || 'Choose one practical action and complete it before looking for more advice.'}

${archetype.actionPlanTitle || 'Your 7-day action plan'}:
${actionPlan.length ? actionPlan.map((step, index) => `${index + 1}. ${step}`).join('\n') : '1. Choose one practical action and complete it before looking for more advice.'}

Avoid this trap:
${archetype.avoidThis || 'Do not confuse a useful diagnosis with a finished plan. Your result is a starting point, not the whole move.'}

Your full playbook:
${playbookUrl}

Download the PDF version:
${pdfUrl}

Best next move:
${archetype.service || 'Book a discovery call'}
${archetype.href ? `https://coachkagiso.co.za${archetype.href}` : 'https://coachkagiso.co.za/book/discovery'}

Your career matters. Keep elevating.

Coach Kagiso
`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlResultEmail(firstName: string, archetype: NonNullable<DiagnosticPayload['archetype']>) {
  const actionPlan = Array.isArray(archetype.actionPlan) ? archetype.actionPlan.filter(Boolean) : [];
  const supportUrl = archetype.href
    ? `https://coachkagiso.co.za${archetype.href}`
    : 'https://coachkagiso.co.za/book/discovery';
  const playbookSlug = archetype.key ? diagnosticArchetypes[archetype.key]?.playbook.slug : null;
  const playbookUrl = playbookSlug
    ? `https://coachkagiso.co.za/resources/career-diagnostic/playbooks/${playbookSlug}`
    : 'https://coachkagiso.co.za/resources/career-diagnostic';
  const pdfUrl = playbookSlug
    ? `https://coachkagiso.co.za/api/diagnostic/playbook-pdf/${playbookSlug}`
    : 'https://coachkagiso.co.za/resources/career-diagnostic';

  return `
  <div style="margin:0;padding:32px 0;background:#f7f3ef;font-family:Arial,Helvetica,sans-serif;color:#142334;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #d8c8bb;">
      <div style="padding:40px 40px 32px;background:#142334;color:#ffffff;">
        <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#c9ad98;font-weight:700;">5-Minute Career Diagnostic</div>
        <h1 style="margin:18px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:42px;line-height:1.02;font-weight:500;">${escapeHtml(
          archetype.name || 'Your career result'
        )}</h1>
        <p style="margin:18px 0 0;font-size:18px;line-height:1.6;color:rgba(255,255,255,0.76);">${escapeHtml(
          archetype.tagline || ''
        )}</p>
      </div>
      <div style="padding:36px 40px 40px;">
        <p style="margin:0 0 18px;font-size:18px;line-height:1.7;">Hi ${escapeHtml(firstName)},</p>
        <p style="margin:0 0 22px;font-size:17px;line-height:1.7;color:rgba(20,35,52,0.78);">
          This result is not just a label. It is a clue about what season your career is in and what kind of move is likely to help next.
        </p>

        <div style="border-top:1px solid rgba(20,35,52,0.12);padding-top:22px;">
          <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#c9ad98;font-weight:700;">What this points to</div>
          <p style="margin:12px 0 0;font-size:17px;line-height:1.75;color:rgba(20,35,52,0.78);">${escapeHtml(
            archetype.diagnosis ||
              'Your result points to a specific career season that deserves a clearer next step.'
          )}</p>
        </div>

        <div style="margin-top:28px;border:1px solid #d8c8bb;background:#f7f1ec;padding:24px;">
          <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#c9ad98;font-weight:700;">Your next 7 days</div>
          <p style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.2;color:#142334;">${escapeHtml(
            archetype.action || 'Choose one practical action and complete it before looking for more advice.'
          )}</p>
          <div style="margin-top:20px;">
            <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#a09086;font-weight:700;">${escapeHtml(
              archetype.actionPlanTitle || 'Your 7-day action plan'
            )}</div>
            <ol style="margin:14px 0 0 20px;padding:0;color:rgba(20,35,52,0.78);font-size:16px;line-height:1.75;">
              ${
                actionPlan.length
                  ? actionPlan.map((step) => `<li style="margin:0 0 10px;">${escapeHtml(step)}</li>`).join('')
                  : '<li style="margin:0 0 10px;">Choose one practical action and complete it before looking for more advice.</li>'
              }
            </ol>
          </div>
          <div style="margin-top:22px;padding-top:18px;border-top:1px solid #d8c8bb;">
            <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#a09086;font-weight:700;">Avoid this trap</div>
            <p style="margin:12px 0 0;font-size:16px;line-height:1.75;color:rgba(20,35,52,0.78);">${escapeHtml(
              archetype.avoidThis ||
                'Do not confuse a useful diagnosis with a finished plan. Your result is a starting point, not the whole move.'
            )}</p>
          </div>
        </div>

        <div style="margin-top:28px;border-top:1px solid rgba(20,35,52,0.12);padding-top:22px;">
          <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#c9ad98;font-weight:700;">Full playbook</div>
          <p style="margin:12px 0 0;font-size:17px;line-height:1.75;color:rgba(20,35,52,0.78);">
            I have also opened a deeper field note for this result with extra signals, priorities, and what progress should look like over the next two weeks.
          </p>
          <a href="${escapeHtml(
            playbookUrl
          )}" style="display:inline-block;margin-top:18px;border:1px solid #d8c8bb;color:#142334;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">
            Open your playbook
          </a>
          <a href="${escapeHtml(
            pdfUrl
          )}" style="display:inline-block;margin-top:12px;margin-left:10px;border:1px solid #d8c8bb;color:#142334;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">
            Download the PDF
          </a>
        </div>

        <div style="margin-top:28px;border-top:1px solid rgba(20,35,52,0.12);padding-top:22px;">
          <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#c9ad98;font-weight:700;">Best next move</div>
          <p style="margin:12px 0 0;font-size:17px;line-height:1.75;color:rgba(20,35,52,0.78);">
            If you want support with this instead of trying to carry it alone, the best-fit next step is <strong style="color:#142334;">${escapeHtml(
              archetype.service || 'a discovery call'
            )}</strong>.
          </p>
          <a href="${escapeHtml(
            supportUrl
          )}" style="display:inline-block;margin-top:18px;background:#142334;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">
            ${escapeHtml(archetype.service || 'Book a discovery call')}
          </a>
        </div>

        <p style="margin:30px 0 0;font-size:16px;line-height:1.75;color:rgba(20,35,52,0.78);">
          Your career matters. Keep elevating.
        </p>
        <p style="margin:18px 0 0;font-size:16px;line-height:1.75;color:#142334;">Coach Kagiso</p>
      </div>
    </div>
  </div>`;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as DiagnosticPayload;
    const firstName = String(payload.firstName || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const answers = payload.answers || {};
    const score = (payload.score || {}) as Partial<Record<OptionKey, number>>;
    const archetype = payload.archetype || {};

    if (!firstName || firstName.length > 50 || !/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(firstName)) {
      return NextResponse.json({ error: 'Please provide a valid first name.' }, { status: 400 });
    }

    if (!email || email.length > 120 || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    if (Object.keys(answers).length !== QUESTION_COUNT || Object.values(answers).some((answer) => !isValidOption(answer))) {
      return NextResponse.json({ error: 'Please complete every diagnostic question.' }, { status: 400 });
    }

    if (!isValidOption(archetype.key) || !archetype.name) {
      return NextResponse.json({ error: 'Diagnostic result is missing.' }, { status: 400 });
    }

    const archetypeName = getCanonicalDiagnosticArchetypeName(archetype.key, archetype.name);
    const canonicalArchetype = {
      ...archetype,
      name: archetypeName,
    };

    const normalisedScore = OPTION_KEYS.reduce<Record<OptionKey, number>>(
      (acc, key) => {
        acc[key] = Number(score[key] || 0);
        return acc;
      },
      { A: 0, B: 0, C: 0, D: 0, E: 0 }
    );

    const supabase = createSupabaseServiceClient();
    const submissionPayload = {
      first_name: firstName,
      email,
      answers,
      score: normalisedScore,
      archetype_key: archetype.key,
      archetype_name: archetypeName,
      archetype_payload: canonicalArchetype,
      next_follow_up_at: getSastDateKey(),
    };

    const { error } = await supabase.from('diagnostic_submissions').insert(submissionPayload);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Could not save diagnostic result.' }, { status: 500 });
    }

    await Promise.all([
      addClientToBrevoList(email, firstName),
      sendTransactionalEmail({
        to: [{ email, name: firstName }],
        subject: `Your Career Diagnostic Result: ${archetypeName}`,
        text: plainResultEmail(firstName, canonicalArchetype),
        html: htmlResultEmail(firstName, canonicalArchetype),
      }),
      sendTransactionalEmail({
        to: [{ email: getContactEmail(), name: 'Coach Kagiso' }],
        subject: `New Diagnostic - ${archetypeName} - ${firstName}`,
        text: `A visitor completed the 5-Minute Career Diagnostic.

Name: ${firstName}
Email: ${email}
Archetype: ${archetypeName}
Recommended service: ${archetype.service || 'Not supplied'}

Score:
${OPTION_KEYS.map((key) => `${key}: ${normalisedScore[key]}`).join('\n')}

Answers:
${Object.entries(answers)
  .sort(([a], [b]) => Number(a) - Number(b))
  .map(([question, answer]) => `Question ${Number(question) + 1}: ${answer}`)
  .join('\n')}
`,
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not submit diagnostic result.' }, { status: 500 });
  }
}
