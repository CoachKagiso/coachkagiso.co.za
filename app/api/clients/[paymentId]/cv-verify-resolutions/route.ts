import { NextResponse } from 'next/server';
import {
  deleteClientCvVerifyResolution,
  listClientCvVerifyResolutions,
  saveClientCvVerifyResolution,
} from '@/lib/client-cv-store';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

const MAX_TITLE_CHARS = 300;
const MAX_RESOLUTION_CHARS = 2000;

function getRequestKey(request: Request, body?: Record<string, unknown> | null) {
  const url = new URL(request.url);
  return String(body?.key || request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '');
}

function compactString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  if (!isDiagnosticAdminAuthorized(getRequestKey(request), request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { paymentId } = await params;
  try {
    const resolutions = await listClientCvVerifyResolutions(paymentId);
    return NextResponse.json({ resolutions });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not load resolved checks.',
    }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!isDiagnosticAdminAuthorized(getRequestKey(request, body), request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { paymentId } = await params;

  const title = compactString(body?.title).slice(0, MAX_TITLE_CHARS);
  const resolution = compactString(body?.resolution).slice(0, MAX_RESOLUTION_CHARS);
  if (!title || !resolution) {
    return NextResponse.json({ error: 'Say what you confirmed before saving it.' }, { status: 400 });
  }

  try {
    const saved = await saveClientCvVerifyResolution({ paymentId, title, resolution });
    return NextResponse.json({ resolution: saved });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not save that resolved check.',
    }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!isDiagnosticAdminAuthorized(getRequestKey(request, body), request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { paymentId } = await params;
  const id = compactString(body?.id) || new URL(request.url).searchParams.get('id') || '';
  if (!id) {
    return NextResponse.json({ error: 'Which resolved check should be reopened?' }, { status: 400 });
  }

  try {
    const removed = await deleteClientCvVerifyResolution({ paymentId, id });
    if (!removed) return NextResponse.json({ error: 'That resolved check no longer exists.' }, { status: 404 });
    return NextResponse.json({ removed });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not reopen that check.',
    }, { status: 500 });
  }
}
