import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { importZohoInboundReplies } from '@/lib/inbound-email-replies';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function normalizeLimit(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 20;
  return Math.max(1, Math.min(Math.floor(numeric), 200));
}

function normalizeDays(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 14;
  return Math.max(1, Math.min(Math.floor(numeric), 90));
}

function isCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  return Boolean(secret && authHeader === `Bearer ${secret}`);
}

function isRequestAuthorized(request: Request, key?: string | null) {
  return isCronAuthorized(request) || isDiagnosticAdminAuthorized(key);
}

function buildResponse(result: Awaited<ReturnType<typeof importZohoInboundReplies>>, missingConfigStatus = 409) {
  const configured = result.missingConfig.length === 0;
  return NextResponse.json(
    {
      success: configured && result.errors.length === 0,
      ...result,
    },
    { status: configured ? 200 : missingConfigStatus },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  const cronAuthorized = isCronAuthorized(request);
  if (!cronAuthorized && !isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await importZohoInboundReplies({
    limit: normalizeLimit(url.searchParams.get('limit')),
    days: normalizeDays(url.searchParams.get('days')),
  });

  return buildResponse(result, cronAuthorized ? 200 : 409);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const key = typeof body.key === 'string' ? body.key : url.searchParams.get('key');

  if (!isRequestAuthorized(request, key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await importZohoInboundReplies({
    limit: normalizeLimit(body.limit),
    days: normalizeDays(body.days),
  });

  return buildResponse(result);
}
