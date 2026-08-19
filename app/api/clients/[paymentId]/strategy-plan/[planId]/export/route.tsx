import { renderToBuffer } from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import ClientStrategyPlanPdf from '@/components/career-tools/ClientStrategyPlanPdf';
import { buildClientStrategyPlanDocx } from '@/lib/client-strategy-plan-docx';
import {
  clientStrategyPlanExportFileName,
  validateClientStrategyPlanExport,
  type ClientStrategyPlanExportOptions,
} from '@/lib/client-strategy-plan-export';
import { getClientStrategyPlan } from '@/lib/client-strategy-store';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { completeClientStrategyFulfillmentItems } from '@/lib/client-strategy-fulfillment';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string; planId: string }> },
) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || request.headers.get('x-diagnostic-admin-key') || '');
  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { paymentId, planId } = await params;
    const plan = await getClientStrategyPlan(paymentId, planId);
    if (!plan) return NextResponse.json({ error: 'Plan version not found.' }, { status: 404 });
    const options: ClientStrategyPlanExportOptions = {
      format: body?.format === 'docx' ? 'docx' : 'pdf',
      includeSessionSummary: body?.includeSessionSummary !== false,
      includeDevelopmentPlan: body?.includeDevelopmentPlan !== false,
      // Opt-in, never inferred from an absent field: this section exists only for Glow Up VIP,
      // so defaulting it to true rejects perfectly valid Career Clarity exports.
      includeInterviewPrep: body?.includeInterviewPrep === true,
    };
    validateClientStrategyPlanExport(plan.editedContent, options);
    const clientName = String(body?.clientName || 'Client').trim().slice(0, 100) || 'Client';
    const fileName = clientStrategyPlanExportFileName({
      clientName,
      serviceSlug: plan.serviceSlug,
      version: plan.version,
      extension: options.format,
    });
    const buffer = options.format === 'docx'
      ? await buildClientStrategyPlanDocx({ plan, clientName, options })
      : await renderToBuffer(<ClientStrategyPlanPdf plan={plan} clientName={clientName} options={options} />);
    await completeClientStrategyFulfillmentItems(paymentId, plan.serviceSlug, ['client_pack_exported']).catch(() => null);
    return new NextResponse(buffer as BodyInit, {
      headers: {
        'content-type': options.format === 'docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf',
        'content-disposition': `attachment; filename="${fileName}"`,
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Choose') || message.includes('Generate') || message.includes('available only')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('Strategy plan export failed:', message || 'unknown error');
    return NextResponse.json({ error: 'Could not export this client pack.' }, { status: 500 });
  }
}
