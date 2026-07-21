import { NextResponse } from 'next/server';
import { sendTransactionalEmail } from '@/lib/brevo';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import {
  getBookingLink,
  getEmailTemplate,
  type EmailTemplateId,
} from '@/lib/email-templates';
import { createNote } from '@/lib/dashboard-task-records';
import { buildEmailHistoryNote } from '@/lib/email-history-note';
import { recordSentEmail } from '@/lib/sent-emails';
import { listStoredEmailTemplates } from '@/lib/settings';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const templateId: EmailTemplateId = 'masterclass_waitlist_bookings_open';

function getFirstName(value?: string | null) {
  return value?.trim().split(/\s+/)[0] || 'there';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainTextToEmailHtml(value: string) {
  const paragraphs = value
    .split(/\r?\n\r?\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p style="margin:0 0 16px;">${escapeHtml(chunk).replace(/\r?\n/g, '<br>')}</p>`)
    .join('');

  return `<div style="font-family:Arial,sans-serif;font-size:15px;color:#142334;line-height:1.7;max-width:560px;">${paragraphs}</div>`;
}

function injectTemplate(value: string, firstName: string) {
  return value
    .split('{{firstName}}')
    .join(firstName)
    .split('[BOOKING LINK]')
    .join(getBookingLink('Saturday Masterclass'))
    .split('[REGISTRATION PAGE LINK]')
    .join(getBookingLink('Saturday Masterclass'));
}

function isMissingSourceColumn(message?: string) {
  return Boolean(message && (message.includes('source') || message.includes('download_link') || message.includes('schema cache')));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const template =
    (await listStoredEmailTemplates(supabase)).find((item) => item.id === templateId && item.active) ||
    getEmailTemplate(templateId);

  const { data, error } = await supabase
    .from('diagnostic_submissions')
    .select('id, first_name, email, archetype_name, archetype_payload')
    .eq('source', 'masterclass_waitlist')
    .eq('lead_status', 'contacted')
    .eq('follow_up_count', 0)
    .order('submitted_at', { ascending: true });

  if (error) {
    if (isMissingSourceColumn(error.message)) {
      return NextResponse.json(
        { error: 'Lead source columns are not live in Supabase yet. Run the lead source migration first.' },
        { status: 409 },
      );
    }
    throw new Error(error.message);
  }

  const leads = (data || []).filter((lead) => lead.email);
  const sentIds: string[] = [];

  for (const lead of leads) {
    const firstName = getFirstName(lead.first_name);
    const subject = injectTemplate(template.subject, firstName);
    const text = injectTemplate(template.body, firstName);

    const brevoResult = await sendTransactionalEmail({
      to: [{ email: lead.email, name: lead.first_name || lead.email }],
      subject,
      text,
      html: plainTextToEmailHtml(text),
    });

    const sentAt = new Date().toISOString();
    const update = await supabase
      .from('diagnostic_submissions')
      .update({
        follow_up_count: 1,
        last_contacted_at: sentAt,
        next_follow_up_at: null,
        updated_at: sentAt,
      })
      .eq('id', lead.id);

    if (update.error) throw new Error(update.error.message);

    try {
      await recordSentEmail({
        leadId: lead.id,
        toEmail: lead.email,
        toName: lead.first_name || lead.email,
        subject,
        body: text,
        templateId,
        archetype: lead.archetype_name || 'Masterclass Waitlist',
        serviceInterest:
          typeof lead.archetype_payload === 'object' && lead.archetype_payload && 'service' in lead.archetype_payload
            ? String(lead.archetype_payload.service || '')
            : 'Saturday Masterclass',
        sentAt,
        origin: 'dashboard',
        externalProvider: brevoResult?.messageId ? 'brevo' : null,
        externalMessageId: brevoResult?.messageId || null,
        deliveryStatus: 'sent',
      });
    } catch (logError) {
      console.error('Sent email log write failed', logError);
    }

    try {
      await createNote({
        linkedLeadId: lead.id,
        body: buildEmailHistoryNote({
          subject,
          templateLabel: `${template.stageLabel} - ${template.archetypeName}`,
          recipientEmail: lead.email,
        }),
      });
    } catch (noteError) {
      console.error('Email history note write failed', noteError);
    }

    sentIds.push(lead.id);
  }

  return NextResponse.json({
    success: true,
    sentCount: sentIds.length,
    skippedCount: Math.max(0, leads.length - sentIds.length),
  });
}
