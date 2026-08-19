import { NextResponse } from 'next/server';
import { isClientStrategyServiceSlug } from '@/lib/client-strategy';
import {
  getClientStrategyFulfillment,
  setClientStrategyFulfillmentItem,
} from '@/lib/client-strategy-fulfillment';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

function keyFrom(request: Request, body?: unknown) {
  return String((body as { key?: string } | null)?.key || request.headers.get('x-diagnostic-admin-key') || new URL(request.url).searchParams.get('key') || '');
}

export async function GET(request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  if (!isDiagnosticAdminAuthorized(keyFrom(request), request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { paymentId } = await params;
  const serviceSlug = new URL(request.url).searchParams.get('service');
  if (!isClientStrategyServiceSlug(serviceSlug)) return NextResponse.json({ error: 'Invalid service.' }, { status: 400 });
  try {
    return NextResponse.json({ items: await getClientStrategyFulfillment(paymentId, serviceSlug) });
  } catch {
    return NextResponse.json({ error: 'Could not load the completion checklist. Apply the latest database migration if this is the first use.' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const body = await request.json().catch(() => null);
  if (!isDiagnosticAdminAuthorized(keyFrom(request, body), request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { paymentId } = await params;
  if (!isClientStrategyServiceSlug(body?.serviceSlug)) return NextResponse.json({ error: 'Invalid service.' }, { status: 400 });
  try {
    const item = await setClientStrategyFulfillmentItem({
      paymentId,
      serviceSlug: body.serviceSlug,
      key: String(body.itemKey || ''),
      completed: body.completed === true,
      source: 'manual',
    });
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update the checklist.' }, { status: 400 });
  }
}
