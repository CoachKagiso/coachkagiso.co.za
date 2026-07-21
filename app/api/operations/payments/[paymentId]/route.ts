import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { deleteClientOperation, updatePaymentDeliveryStatus, type DeliveryStatus } from '@/lib/client-operations';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ paymentId: string }>;
};

function isDeliveryStatus(value: string): value is DeliveryStatus {
  return value === 'not_started' || value === 'in_progress' || value === 'delivered' || value === 'cancelled';
}

function redirectWithStatus(redirectTo: string, requestUrl: string, status: 'updated' | 'deleted' | 'unauthorized' | 'invalid') {
  const url = new URL(redirectTo || '/resources/career-diagnostic/submissions', requestUrl);
  url.searchParams.set(status === 'updated' || status === 'deleted' ? 'updated' : 'error', status);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request, context: RouteContext) {
  const { paymentId } = await context.params;
  const formData = await request.formData();
  const key = String(formData.get('key') || '');
  const redirectTo = String(formData.get('redirectTo') || '/resources/career-diagnostic/submissions');
  const intent = String(formData.get('intent') || 'save');
  const confirmDelete = String(formData.get('confirm_delete') || '');
  const deliveryStatus = String(formData.get('delivery_status') || '');
  const deliveryNotes = String(formData.get('delivery_notes') || '').trim();

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return redirectWithStatus(redirectTo, request.url, 'unauthorized');
  }

  if (intent === 'delete') {
    if (confirmDelete !== paymentId) {
      return redirectWithStatus(redirectTo, request.url, 'invalid');
    }

    await deleteClientOperation(paymentId);
    return redirectWithStatus(redirectTo, request.url, 'deleted');
  }

  if (!isDeliveryStatus(deliveryStatus)) {
    return redirectWithStatus(redirectTo, request.url, 'invalid');
  }

  await updatePaymentDeliveryStatus(paymentId, {
    delivery_status: deliveryStatus,
    delivery_notes: deliveryNotes || null,
  });

  return redirectWithStatus(redirectTo, request.url, 'updated');
}
