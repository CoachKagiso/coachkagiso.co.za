import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import {
  listInboundEmailReplies,
  repairInboundEmailReplyLeadLinks,
} from '@/lib/inbound-email-replies';
import { isDiagnosticLeadSource } from '@/lib/lead-sources';

export const dynamic = 'force-dynamic';

function getRequestKey(request: Request) {
  const url = new URL(request.url);
  return request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '';
}

function normalizeLimit(value: string | null) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 50;
  return Math.max(1, Math.min(Math.floor(numeric), 250));
}

function normalizeStatus(value: string | null) {
  return value === 'new' || value === 'reviewed' || value === 'archived' ? value : null;
}

export async function GET(request: Request) {
  if (!isDiagnosticAdminAuthorized(getRequestKey(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const source = url.searchParams.get('source');
  if (source && source !== 'all' && !isDiagnosticLeadSource(source)) {
    return NextResponse.json({ error: 'Unsupported inbound source filter.' }, { status: 400 });
  }

  const normalizedSource = isDiagnosticLeadSource(source) ? source : null;
  const limit = normalizeLimit(url.searchParams.get('limit'));
  const status = normalizeStatus(url.searchParams.get('status'));
  const shouldRepairLinks = url.searchParams.get('repair') !== 'false';
  const repaired = shouldRepairLinks
    ? await repairInboundEmailReplyLeadLinks({ limit: Math.max(limit, 50) })
    : { scanned: 0, linked: 0 };

  const replies = await listInboundEmailReplies({
    limit,
    status,
    source: normalizedSource,
    repairLeadLinks: false,
  });

  return NextResponse.json({
    replies,
    totalCount: replies.length,
    filters: {
      source: normalizedSource || 'all',
      status: status || 'all',
      limit,
    },
    repaired,
  });
}
