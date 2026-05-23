import { NextResponse } from 'next/server';
import { listClientOperations } from '@/lib/client-operations';
import { listContentBacklogItems, listContentCalendarItems } from '@/lib/content-studio';
import { isDiagnosticAdminAuthorized, listDiagnosticSubmissions } from '@/lib/diagnostic-submissions';
import { buildAssistantDashboardContext } from '@/lib/growth-os-assistant';

export const dynamic = 'force-dynamic';

function getRequestKey(request: Request) {
  const url = new URL(request.url);
  return request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '';
}

export async function GET(request: Request) {
  if (!isDiagnosticAdminAuthorized(getRequestKey(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [submissions, operations, backlogItems, calendarItems] = await Promise.all([
    listDiagnosticSubmissions(),
    listClientOperations(),
    listContentBacklogItems(),
    listContentCalendarItems(),
  ]);

  return NextResponse.json({
    context: buildAssistantDashboardContext({
      submissions,
      operations,
      backlogItems,
      calendarItems,
    }),
  });
}
