import { NextResponse } from 'next/server';
import {
  getDiagnosticSubmissionById,
  isDiagnosticAdminAuthorized,
  updateDiagnosticSubmissionCrm,
} from '@/lib/diagnostic-submissions';
import {
  getEmailTemplateGuardrail,
} from '@/lib/email-template-guardrails';
import {
  getSequenceRepairNote,
  isSequenceRepairStatus,
  type SequenceRepairAction,
} from '@/lib/email-sequence-repair';
import { createNote } from '@/lib/dashboard-task-records';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

async function getSentTemplateIds(leadId: string, email: string) {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from('sent_emails')
    .select('template_id')
    .not('template_id', 'is', null);

  if (email) {
    query = query.or(`lead_id.eq.${leadId},to_email.eq.${email.toLowerCase()}`);
  } else {
    query = query.eq('lead_id', leadId);
  }

  const { data, error } = await query.order('sent_at', { ascending: true }).limit(100);
  if (error) throw new Error(error.message);
  return (data || []).map((row) => row.template_id as string | null);
}

function getSystemNote(action: SequenceRepairAction) {
  const date = new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date());

  return `[System note - ${date}]
${getSequenceRepairNote(action)}`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leadId = String(body?.leadId || '').trim();
  const action = String(body?.action || '').trim();
  if (!leadId) {
    return NextResponse.json({ error: 'Lead ID is required.' }, { status: 400 });
  }

  if (!isSequenceRepairStatus(action)) {
    return NextResponse.json({ error: 'Invalid sequence repair action.' }, { status: 400 });
  }

  const lead = await getDiagnosticSubmissionById(leadId);
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  }

  const repairedAt = new Date().toISOString();
  await updateDiagnosticSubmissionCrm(leadId, {
    sequence_repair_status: action,
    sequence_repaired_at: repairedAt,
    next_follow_up_at: action === 'manual' ? null : undefined,
  });

  const note = await createNote({
    body: getSystemNote(action),
    linkedLeadId: leadId,
  });

  const updatedLead = await getDiagnosticSubmissionById(leadId);
  const sentTemplateIds = await getSentTemplateIds(leadId, lead.email);
  const guardrail = getEmailTemplateGuardrail({
    archetypeName: updatedLead?.archetype_name,
    archetypeKey: updatedLead?.archetype_key,
    followUpCount: updatedLead?.follow_up_count,
    leadStatus: updatedLead?.lead_status,
    lastContactedAt: updatedLead?.last_contacted_at,
    source: updatedLead?.source,
    sequenceRepairStatus: updatedLead?.sequence_repair_status,
  }, sentTemplateIds);

  return NextResponse.json({
    success: true,
    note,
    submission: updatedLead,
    guardrail,
  });
}
