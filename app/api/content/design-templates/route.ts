import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import {
  createDesignTemplate,
  deleteDesignTemplate,
  isDesignTemplateFormatValue,
  isDesignTemplateKindValue,
  listDesignTemplates,
  updateDesignTemplate,
} from '@/lib/content/design-templates';

export const dynamic = 'force-dynamic';

// A DesignDocument with many pages of layers is large. 4MB keeps a runaway
// document from being written to the row while staying far above any realistic
// template.
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

  const templates = await listDesignTemplates();
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const name = String(body?.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Template name is required.' }, { status: 400 });

  if (!isDesignTemplateKindValue(body?.kind)) {
    return NextResponse.json({ error: 'Invalid template kind.' }, { status: 400 });
  }
  if (!isDesignTemplateFormatValue(body?.format)) {
    return NextResponse.json({ error: 'Invalid template format.' }, { status: 400 });
  }

  const width = Number(body?.width);
  const height = Number(body?.height);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    return NextResponse.json({ error: 'Template width and height must be positive numbers.' }, { status: 400 });
  }

  const document = readDocument(body?.document);
  if (!document) return NextResponse.json({ error: 'Template document is required.' }, { status: 400 });
  if (isDocumentTooLarge(document)) {
    return NextResponse.json({ error: 'This design is too large to save as a template.' }, { status: 413 });
  }

  try {
    const template = await createDesignTemplate({
      name,
      kind: body.kind,
      format: body.format,
      width,
      height,
      sourceCarouselTemplate: body?.sourceCarouselTemplate ? String(body.sourceCarouselTemplate) : null,
      sourceCarouselLayoutRecipe: body?.sourceCarouselLayoutRecipe ? String(body.sourceCarouselLayoutRecipe) : null,
      document,
    });
    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save this template.' },
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
  if (!id) return NextResponse.json({ error: 'Template id is required.' }, { status: 400 });

  const patch: Parameters<typeof updateDesignTemplate>[1] = {};

  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: 'Template name cannot be empty.' }, { status: 400 });
    patch.name = name;
  }
  if (body?.kind !== undefined) {
    if (!isDesignTemplateKindValue(body.kind)) {
      return NextResponse.json({ error: 'Invalid template kind.' }, { status: 400 });
    }
    patch.kind = body.kind;
  }
  if (body?.format !== undefined) {
    if (!isDesignTemplateFormatValue(body.format)) {
      return NextResponse.json({ error: 'Invalid template format.' }, { status: 400 });
    }
    patch.format = body.format;
  }
  if (body?.width !== undefined) {
    const width = Number(body.width);
    if (!Number.isFinite(width) || width <= 0) {
      return NextResponse.json({ error: 'Template width must be a positive number.' }, { status: 400 });
    }
    patch.width = width;
  }
  if (body?.height !== undefined) {
    const height = Number(body.height);
    if (!Number.isFinite(height) || height <= 0) {
      return NextResponse.json({ error: 'Template height must be a positive number.' }, { status: 400 });
    }
    patch.height = height;
  }
  if (body?.sourceCarouselTemplate !== undefined) {
    patch.sourceCarouselTemplate = body.sourceCarouselTemplate ? String(body.sourceCarouselTemplate) : null;
  }
  if (body?.sourceCarouselLayoutRecipe !== undefined) {
    patch.sourceCarouselLayoutRecipe = body.sourceCarouselLayoutRecipe
      ? String(body.sourceCarouselLayoutRecipe)
      : null;
  }
  if (body?.document !== undefined) {
    const document = readDocument(body.document);
    if (!document) return NextResponse.json({ error: 'Template document is invalid.' }, { status: 400 });
    if (isDocumentTooLarge(document)) {
      return NextResponse.json({ error: 'This design is too large to save as a template.' }, { status: 413 });
    }
    patch.document = document;
  }

  try {
    const template = await updateDesignTemplate(id, patch);
    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update this template.' },
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
  if (!id) return NextResponse.json({ error: 'Template id is required.' }, { status: 400 });

  try {
    await deleteDesignTemplate(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not delete this template.' },
      { status: 500 },
    );
  }
}
