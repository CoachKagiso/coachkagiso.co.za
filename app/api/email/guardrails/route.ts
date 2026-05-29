import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { getEmailTemplateGuardrail } from '@/lib/email-template-guardrails';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type LeadRow = {
  id: string;
  email: string | null;
  archetype_name: string | null;
  archetype_key: string | null;
  source: string | null;
  lead_status: string | null;
  follow_up_count: number | null;
  last_contacted_at: string | null;
  sequence_repair_status: string | null;
};

function getRequestKey(request: Request) {
  const url = new URL(request.url);
  return request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '';
}

async function getSentTemplateIds(lead: LeadRow) {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from('sent_emails')
    .select('template_id')
    .not('template_id', 'is', null);

  if (lead.email) {
    query = query.or(`lead_id.eq.${lead.id},to_email.eq.${lead.email.toLowerCase()}`);
  } else {
    query = query.eq('lead_id', lead.id);
  }

  const { data, error } = await query.order('sent_at', { ascending: true }).limit(100);
  if (error) throw new Error(error.message);
  return (data || []).map((row) => row.template_id as string | null);
}

export async function GET(request: Request) {
  if (!isDiagnosticAdminAuthorized(getRequestKey(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const leadId = url.searchParams.get('leadId') || '';
  if (!leadId) {
    return NextResponse.json({ error: 'Lead ID is required.' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('diagnostic_submissions')
    .select('id, email, archetype_name, archetype_key, source, lead_status, follow_up_count, last_contacted_at, sequence_repair_status')
    .eq('id', leadId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  }

  const lead = data as LeadRow;
  const sentTemplateIds = await getSentTemplateIds(lead);
  const guardrail = getEmailTemplateGuardrail({
    archetypeName: lead.archetype_name,
    archetypeKey: lead.archetype_key,
    followUpCount: lead.follow_up_count,
    leadStatus: lead.lead_status,
    lastContactedAt: lead.last_contacted_at,
    source: lead.source,
    sequenceRepairStatus: lead.sequence_repair_status,
  }, sentTemplateIds);

  return NextResponse.json({ guardrail });
}
