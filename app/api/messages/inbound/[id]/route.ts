import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import {
  updateInboundEmailReply,
  type InboundEmailDraftStatus,
  type InboundEmailReplyStatus,
} from '@/lib/inbound-email-replies';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isStatus(value: string): value is InboundEmailReplyStatus {
  return value === 'new' || value === 'reviewed' || value === 'archived';
}

function isDraftStatus(value: string): value is InboundEmailDraftStatus {
  return value === 'drafted' || value === 'approved' || value === 'sent' || value === 'dismissed';
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = String(body?.status || '');
  const draftStatus = String(body?.draftStatus || '');

  const reply = await updateInboundEmailReply(id, {
    status: isStatus(status) ? status : undefined,
    draftStatus: isDraftStatus(draftStatus) ? draftStatus : undefined,
  });

  return NextResponse.json({ reply });
}
