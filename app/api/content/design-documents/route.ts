import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import {
  createDesignDocumentRecord,
  deleteDesignDocumentRecord,
  getDesignDocument,
  listDesignDocumentSummaries,
  updateDesignDocumentRecord,
} from '@/lib/content/design-documents';
import { isDesignTemplateFormatValue } from '@/lib/content/design-templates';

export const dynamic = 'force-dynamic';

const MAX_DOCUMENT_BYTES = 4_000_000;

function readDocument(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.pages)) return null;
  return record;
}

function isDocumentTooLarge(document: Record<string, unknown>) {
  return JSON.stringify(document).length > MAX_DOCUMENT_BYTES;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ?id= returns one full design; without it, summaries only (no jsonb bodies).
  const id = url.searchParams.get('id');
  if (id) {
    const design = await getDesignDocument(id);
    if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
    return NextResponse.json({ design });
  }

  const designs = await listDesignDocumentSummaries();
  return NextResponse.json({ designs });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDesignTemplateFormatValue(body?.format)) {
    return NextResponse.json({ error: 'Invalid design format.' }, { status: 400 });
  }

  const width = Number(body?.width);
  const height = Number(body?.height);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    return NextResponse.json({ error: 'Design width and height must be positive numbers.' }, { status: 400 });
  }

  const document = readDocument(body?.document);
  if (!document) return NextResponse.json({ error: 'Design document is required.' }, { status: 400 });
  if (isDocumentTooLarge(document)) {
    return NextResponse.json({ error: 'This design is too large to save.' }, { status: 413 });
  }

  try {
    const design = await createDesignDocumentRecord({
      title: String(body?.title || 'Untitled design'),
      format: body.format,
      width,
      height,
      document,
    });
    return NextResponse.json({ design });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save this design.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = String(body?.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Design id is required.' }, { status: 400 });

  const patch: Parameters<typeof updateDesignDocumentRecord>[1] = {};

  if (body?.title !== undefined) patch.title = String(body.title);
  if (body?.format !== undefined) {
    if (!isDesignTemplateFormatValue(body.format)) {
      return NextResponse.json({ error: 'Invalid design format.' }, { status: 400 });
    }
    patch.format = body.format;
  }
  if (body?.width !== undefined) {
    const width = Number(body.width);
    if (!Number.isFinite(width) || width <= 0) {
      return NextResponse.json({ error: 'Design width must be a positive number.' }, { status: 400 });
    }
    patch.width = width;
  }
  if (body?.height !== undefined) {
    const height = Number(body.height);
    if (!Number.isFinite(height) || height <= 0) {
      return NextResponse.json({ error: 'Design height must be a positive number.' }, { status: 400 });
    }
    patch.height = height;
  }
  if (body?.document !== undefined) {
    const document = readDocument(body.document);
    if (!document) return NextResponse.json({ error: 'Design document is invalid.' }, { status: 400 });
    if (isDocumentTooLarge(document)) {
      return NextResponse.json({ error: 'This design is too large to save.' }, { status: 413 });
    }
    patch.document = document;
  }

  try {
    const design = await updateDesignDocumentRecord(id, patch);
    return NextResponse.json({ design });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update this design.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = String(body?.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Design id is required.' }, { status: 400 });

  try {
    await deleteDesignDocumentRecord(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not delete this design.' },
      { status: 500 },
    );
  }
}
