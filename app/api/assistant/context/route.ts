import { NextResponse } from 'next/server';
import { listClientOperations } from '@/lib/client-operations';
import { listContentBacklogItems, listContentCalendarItems } from '@/lib/content-studio';
import { isDiagnosticAdminAuthorized, listDiagnosticSubmissions } from '@/lib/diagnostic-submissions';
import { buildAssistantDashboardContext } from '@/lib/growth-os-assistant';
import { listInboundEmailReplies } from '@/lib/inbound-email-replies';
import { listSentEmails } from '@/lib/sent-emails';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { loadSettings, normalizeBusinessGoalsSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

function getRequestKey(request: Request) {
  const url = new URL(request.url);
  return request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '';
}

async function loadAssistantBusinessGoals() {
  try {
    const supabase = createSupabaseServiceClient();
    const settings = await loadSettings(supabase);
    return normalizeBusinessGoalsSettings(settings.business_goals);
  } catch {
    return normalizeBusinessGoalsSettings(null);
  }
}

export async function GET(request: Request) {
  if (!isDiagnosticAdminAuthorized(getRequestKey(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [submissions, operations, backlogItems, calendarItems, inboundEmailReplies, sentEmailLog, businessGoals] = await Promise.all([
    listDiagnosticSubmissions(),
    listClientOperations(),
    listContentBacklogItems(),
    listContentCalendarItems(),
    listInboundEmailReplies({ limit: 60 }),
    listSentEmails(),
    loadAssistantBusinessGoals(),
  ]);

  return NextResponse.json({
    context: buildAssistantDashboardContext({
      submissions,
      operations,
      backlogItems,
      calendarItems,
      inboundEmailReplies,
      sentEmails: sentEmailLog.emails,
      businessGoals,
    }),
  });
}
