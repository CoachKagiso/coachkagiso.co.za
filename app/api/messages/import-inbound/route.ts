import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { importZohoInboundReplies } from '@/lib/inbound-email-replies';
import { importZohoSentEmails } from '@/lib/zoho-sent-email-import';

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
  return isCronAuthorized(request) || isDiagnosticAdminAuthorized(key, request);
}

type InboundImportResult = Awaited<ReturnType<typeof importZohoInboundReplies>>;
type SentImportResult = Awaited<ReturnType<typeof importZohoSentEmails>>;

function buildResponse(inbound: InboundImportResult, sent: SentImportResult, missingConfigStatus = 409) {
  const missingConfig = Array.from(new Set([...inbound.missingConfig, ...sent.missingConfig]));
  const errors = [...inbound.errors, ...sent.errors];
  const configured = missingConfig.length === 0;
  return NextResponse.json(
    {
      success: configured && errors.length === 0,
      ...inbound,
      missingConfig,
      errors,
      sent,
    },
    { status: configured ? 200 : missingConfigStatus },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  const cronAuthorized = isCronAuthorized(request);
  if (!cronAuthorized && !isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const importOptions = {
    limit: normalizeLimit(url.searchParams.get('limit')),
    days: normalizeDays(url.searchParams.get('days')),
  };
  const inbound = await importZohoInboundReplies(importOptions);
  const sent = await importZohoSentEmails(importOptions);

  return buildResponse(inbound, sent, cronAuthorized ? 200 : 409);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const key = typeof body.key === 'string' ? body.key : url.searchParams.get('key');

  if (!isRequestAuthorized(request, key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const importOptions = {
    limit: normalizeLimit(body.limit),
    days: normalizeDays(body.days),
  };
  const inbound = await importZohoInboundReplies(importOptions);
  const sent = await importZohoSentEmails(importOptions);

  return buildResponse(inbound, sent);
}
