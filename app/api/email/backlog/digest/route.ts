import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { sendEmailBacklogDigest } from '@/lib/email-backlog-digest';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  return Boolean(secret && authHeader === `Bearer ${secret}`);
}

function isRequestAuthorized(request: Request, key?: string | null) {
  return isCronAuthorized(request) || isDiagnosticAdminAuthorized(key, request);
}

async function run(request: Request, { key, force }: { key: string; force: boolean }) {
  if (!isRequestAuthorized(request, key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendEmailBacklogDigest({ force });
    return NextResponse.json({
      sent: result.sent,
      reason: 'reason' in result ? result.reason : undefined,
      subject: 'subject' in result ? result.subject : undefined,
      counts: result.backlog.counts,
      oldestDaysOverdue: result.backlog.oldestDaysOverdue,
    });
  } catch (error) {
    console.error('Email backlog digest failed', error);
    return NextResponse.json({ error: 'Could not send the backlog digest.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return run(request, {
    key: request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '',
    force: url.searchParams.get('force') === 'true',
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  return run(request, {
    key: String(body?.key || ''),
    force: body?.force === true,
  });
}
