export type ExtractedPostMetadata = {
  platform?: string;
  pillar?: string;
  register?: string;
  body: string;
};

const metadataPrefixes = ['VOICE MODE:', 'PLATFORM:', 'PILLAR:', 'WRITING REGISTER:', 'REGISTER:', '---'];
const jsonBodyKeys = [
  'post',
  'body',
  'draftContent',
  'draft_content',
  'polishedPost',
  'polished_post',
  'finalPost',
  'final_post',
  'content',
  'text',
  'output',
];
const jsonCaptionBodyKeys = ['caption', 'postCaption', 'post_caption'];

function isMetadataLine(value: string) {
  const normalized = value.trim().toUpperCase();
  return metadataPrefixes.some((prefix) => normalized.startsWith(prefix)) || normalized.startsWith('VOICE MODE');
}

function isStructuredShellTitle(value: string) {
  const trimmed = value.trim();
  return trimmed === '{' || trimmed === '[' || trimmed.startsWith('{') || trimmed.startsWith('```json');
}

function parseMetadataPart(part: string) {
  const [rawKey, ...rawValueParts] = part.split(':');
  const key = rawKey.trim().toUpperCase();
  const value = rawValueParts.join(':').trim();
  if (!value) return null;

  if (key === 'PLATFORM') return { platform: value };
  if (key === 'PILLAR') return { pillar: value };
  if (key === 'WRITING REGISTER' || key === 'REGISTER' || key === 'VOICE MODE') return { register: value };
  return null;
}

function parseMetadataLine(value: string) {
  const parts = value
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  const parsed = parts.reduce<Omit<ExtractedPostMetadata, 'body'>>((accumulator, part) => {
    const next = parseMetadataPart(part);
    return next ? { ...accumulator, ...next } : accumulator;
  }, {});

  return parsed.platform || parsed.pillar || parsed.register ? parsed : null;
}

function asPlainObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function compactString(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function multilineString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function extractJsonCandidates(raw: string) {
  const trimmed = raw.trim();
  const candidates: string[] = [];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  if (trimmed) candidates.push(trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim());

  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

function parseJsonFromOutput(raw: string): unknown | null {
  for (const candidate of extractJsonCandidates(raw)) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

function firstStringValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = multilineString(record[key]);
    if (value) return value;
  }
  return '';
}

function hasCarouselSlides(record: Record<string, unknown>) {
  return Array.isArray(record.slides) || Array.isArray(record.carouselSlides) || Array.isArray(record.carousel_slides);
}

function extractJsonBody(record: Record<string, unknown>): string {
  const directBody = firstStringValue(record, jsonBodyKeys);
  if (directBody) return directBody;

  if (!hasCarouselSlides(record)) {
    const captionBody = firstStringValue(record, jsonCaptionBodyKeys);
    if (captionBody) return captionBody;
  }

  const nestedCandidates = [
    asPlainObject(record.result),
    asPlainObject(record.response),
    asPlainObject(record.draft),
    asPlainObject(record.data),
  ].filter((candidate): candidate is Record<string, unknown> => Boolean(candidate));

  for (const nested of nestedCandidates) {
    const nestedBody = extractJsonBody(nested);
    if (nestedBody) return nestedBody;
  }

  return '';
}

function extractJsonMetadata(raw: string): ExtractedPostMetadata | null {
  const parsed = parseJsonFromOutput(raw);
  const record = asPlainObject(parsed);
  if (!record) return null;

  const metadataRecord = asPlainObject(record.metadata) || record;
  const body = extractJsonBody(record);
  if (!body) return null;

  return {
    platform: compactString(metadataRecord.platform),
    pillar: compactString(metadataRecord.pillar ?? metadataRecord.contentPillar ?? metadataRecord.content_pillar),
    register: compactString(metadataRecord.register ?? metadataRecord.writingRegister ?? metadataRecord.writing_register),
    body,
  };
}

/**
 * Separates model metadata from the actual post body so the dashboard can
 * display context without putting those labels into copied social content.
 */
export function extractOutputMetadata(raw: string): ExtractedPostMetadata {
  if (!raw) return { body: '' };

  const jsonMetadata = extractJsonMetadata(raw);
  if (jsonMetadata) return jsonMetadata;

  const lines = raw.split('\n');
  let contentStartIndex = 0;
  let foundContent = false;
  const metadata: Omit<ExtractedPostMetadata, 'body'> = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    if (line === '---') continue;

    const parsed = parseMetadataLine(line);
    if (parsed) {
      Object.assign(metadata, parsed);
      continue;
    }

    contentStartIndex = index;
    foundContent = true;
    break;
  }

  return {
    ...metadata,
    body: foundContent ? lines.slice(contentStartIndex).join('\n').trim() : '',
  };
}

/**
 * Strips AI output metadata headers from existing content backlog records.
 */
export function extractPostBody(raw: string) {
  return extractOutputMetadata(raw).body;
}

/**
 * Returns a display-safe title for backlog records saved before metadata cleanup.
 */
export function extractCleanTitle(title: string, content: string) {
  const trimmedTitle = title.trim();
  if (trimmedTitle && !isMetadataLine(trimmedTitle) && !isStructuredShellTitle(trimmedTitle)) return trimmedTitle;

  const body = extractPostBody(content);
  if (!body) return trimmedTitle ? 'Untitled draft' : 'Untitled';

  const firstSentence = body.split(/[.!?]/)[0].trim();
  if (firstSentence && firstSentence.length <= 60) return firstSentence;

  return `${body.slice(0, 60).trim()}...`;
}

/**
 * Creates a short display preview from post content after metadata cleanup.
 */
export function extractPreview(content: string, maxChars = 120) {
  if (!content) return '';
  const body = extractPostBody(content);
  if (body.length <= maxChars) return body;
  return `${body.slice(0, maxChars).trim()}...`;
}
