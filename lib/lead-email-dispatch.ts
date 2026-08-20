import { validateLeadEmailTemplateSelection } from '@/lib/email-template-guardrails';
import { hasSentEmailTemplateAlreadySent, recordSentEmail } from '@/lib/sent-emails';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export type LeadEmailDispatchInput = {
  to: string;
  toName: string;
  subject: string;
  htmlContent: string;
  plainTextBody?: string;
  leadId?: string | null;
  templateId?: string | null;
  archetype?: string | null;
  serviceInterest?: string | null;
  scheduledAt?: Date | null;
  origin?: string;
};

export type LeadEmailDispatchResult =
  | { ok: true; scheduledAt: string | null; messageId: string | null }
  | { ok: false; status: number; error: string };

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function validateTemplateGuardrails(leadId: string, toEmail: string, templateId: string) {
  if (!leadId || !templateId) return null;

  const supabase = createSupabaseServiceClient();
  const { data: lead, error: leadError } = await supabase
    .from('diagnostic_submissions')
    .select('id, email, archetype_name, archetype_key, source, lead_status, follow_up_count, last_contacted_at, sequence_repair_status')
    .eq('id', leadId)
    .maybeSingle();

  if (leadError) throw new Error(leadError.message);
  if (!lead) return null;

  let query = supabase.from('sent_emails').select('template_id').not('template_id', 'is', null);

  const cleanLeadEmail = String(lead.email || toEmail || '').trim().toLowerCase();
  if (cleanLeadEmail) {
    query = query.or(`lead_id.eq.${leadId},to_email.eq.${cleanLeadEmail}`);
  } else {
    query = query.eq('lead_id', leadId);
  }

  const { data: sentRows, error: sentError } = await query.order('sent_at', { ascending: true }).limit(100);
  if (sentError) throw new Error(sentError.message);

  return validateLeadEmailTemplateSelection({
    lead: {
      archetypeName: lead.archetype_name,
      archetypeKey: lead.archetype_key,
      followUpCount: lead.follow_up_count,
      leadStatus: lead.lead_status,
      lastContactedAt: lead.last_contacted_at,
      source: lead.source,
      sequenceRepairStatus: lead.sequence_repair_status,
    },
    sentTemplateIds: (sentRows || []).map((row) => row.template_id as string | null),
    templateId,
  });
}

/**
 * Single path for every lead email the dashboard sends: sequence guardrails,
 * duplicate-template protection, the Brevo call, and the sent-email log entry.
 */
export async function dispatchLeadEmail(input: LeadEmailDispatchInput): Promise<LeadEmailDispatchResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { ok: false, status: 500, error: 'Brevo is not configured.' };

  const to = input.to.trim();
  const subject = input.subject.trim();
  const htmlContent = input.htmlContent.trim();
  const leadId = String(input.leadId || '').trim();
  const templateId = String(input.templateId || '').trim();
  const scheduledAt = input.scheduledAt || null;

  if (!isEmail(to) || !subject || !htmlContent) {
    return { ok: false, status: 400, error: 'Recipient, subject, and email body are required.' };
  }

  if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
    return { ok: false, status: 400, error: 'Scheduled send time must be in the future.' };
  }

  if (templateId) {
    const guardrail = await validateTemplateGuardrails(leadId, to, templateId);
    if (guardrail && !guardrail.valid) {
      return { ok: false, status: 409, error: guardrail.message };
    }

    const duplicateTemplate = await hasSentEmailTemplateAlreadySent({
      leadId: leadId || null,
      toEmail: to,
      templateId,
    });

    if (duplicateTemplate) {
      return {
        ok: false,
        status: 409,
        error: 'This template has already been sent to this lead. Choose the next template before sending again.',
      };
    }
  }

  const brevoPayload: Record<string, unknown> = {
    sender: {
      name: 'Kagiso Shabangu',
      email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@coachkagiso.co.za',
    },
    to: [{ email: to, name: input.toName || to }],
    subject,
    htmlContent,
  };

  if (scheduledAt) {
    brevoPayload.scheduledAt = scheduledAt.toISOString();
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(brevoPayload),
  });

  if (!response.ok) {
    console.error('Brevo send failed', {
      status: response.status,
      body: await response.text().catch(() => ''),
    });
    return { ok: false, status: 500, error: 'Email failed to send. Try again.' };
  }

  const brevoResult = (await response.json().catch(() => ({}))) as { messageId?: string };

  try {
    await recordSentEmail({
      leadId: leadId || null,
      toEmail: to,
      toName: input.toName || to,
      subject,
      body: input.plainTextBody || htmlContent,
      templateId: templateId || null,
      archetype: input.archetype || null,
      serviceInterest: input.serviceInterest || null,
      sentAt: new Date().toISOString(),
      scheduledAt: scheduledAt?.toISOString() || null,
      origin: input.origin || 'dashboard',
      externalProvider: brevoResult.messageId ? 'brevo' : null,
      externalMessageId: brevoResult.messageId || null,
      deliveryStatus: scheduledAt ? 'scheduled' : 'sent',
    });
  } catch (error) {
    console.error('Sent email log write failed', error);
  }

  return { ok: true, scheduledAt: scheduledAt?.toISOString() || null, messageId: brevoResult.messageId || null };
}
