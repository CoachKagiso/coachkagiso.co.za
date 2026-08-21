import { createSupabaseServiceClient } from '@/lib/supabase-server';
import {
  isDesignTemplateFormatValue,
  type DesignTemplateFormatValue,
} from '@/lib/content/design-templates';

// Saved Design Studio designs. Formats are shared with design_templates, so the
// validator lives there rather than being duplicated.

export type DesignDocumentInput = {
  title: string;
  format: DesignTemplateFormatValue;
  width: number;
  height: number;
  document: Record<string, unknown>;
};

type DesignDocumentRow = {
  id: string;
  title: string;
  format: string;
  width: number;
  height: number;
  document: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DesignDocumentItem = {
  id: string;
  title: string;
  format: DesignTemplateFormatValue;
  width: number;
  height: number;
  document: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const SELECT_COLUMNS = 'id, title, format, width, height, document, created_at, updated_at';

// A design carries every page and layer, so listing them all would ship a lot of
// jsonb the list view never renders. The summary query omits `document`.
const SUMMARY_COLUMNS = 'id, title, format, width, height, created_at, updated_at';

export type DesignDocumentSummary = Omit<DesignDocumentItem, 'document'>;

function isMissingDesignDocumentsTable(message?: string) {
  return Boolean(
    message &&
      (message.includes('design_documents') ||
        message.includes('Could not find the table') ||
        message.includes('does not exist')),
  );
}

function normalizeRow(row: DesignDocumentRow): DesignDocumentItem {
  return {
    id: row.id,
    title: row.title,
    format: isDesignTemplateFormatValue(row.format) ? row.format : 'social_graphic',
    width: row.width,
    height: row.height,
    document: row.document,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPayload(input: DesignDocumentInput) {
  return {
    title: input.title.trim() || 'Untitled design',
    format: input.format,
    width: Math.round(input.width),
    height: Math.round(input.height),
    document: input.document,
  };
}

export async function listDesignDocumentSummaries(limit = 24): Promise<DesignDocumentSummary[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('design_documents')
    .select(SUMMARY_COLUMNS)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingDesignDocumentsTable(error.message)) return [];
    console.error('Failed to fetch design documents:', error.message);
    return [];
  }

  return ((data || []) as Omit<DesignDocumentRow, 'document'>[]).map((row) => ({
    id: row.id,
    title: row.title,
    format: isDesignTemplateFormatValue(row.format) ? row.format : 'social_graphic',
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getDesignDocument(id: string): Promise<DesignDocumentItem | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('design_documents')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    if (isMissingDesignDocumentsTable(error.message)) return null;
    console.error('Failed to fetch design document:', error.message);
    return null;
  }

  return data ? normalizeRow(data as DesignDocumentRow) : null;
}

export async function createDesignDocumentRecord(input: DesignDocumentInput): Promise<DesignDocumentItem> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('design_documents')
    .insert(toPayload(input))
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return normalizeRow(data as DesignDocumentRow);
}

export async function updateDesignDocumentRecord(
  id: string,
  input: Partial<DesignDocumentInput>,
): Promise<DesignDocumentItem> {
  const supabase = createSupabaseServiceClient();
  const payload: Record<string, unknown> = {};

  if (input.title !== undefined) payload.title = input.title.trim() || 'Untitled design';
  if (input.format !== undefined) payload.format = input.format;
  if (input.width !== undefined) payload.width = Math.round(input.width);
  if (input.height !== undefined) payload.height = Math.round(input.height);
  if (input.document !== undefined) payload.document = input.document;

  const { data, error } = await supabase
    .from('design_documents')
    .update(payload)
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return normalizeRow(data as DesignDocumentRow);
}

export async function deleteDesignDocumentRecord(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('design_documents').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
