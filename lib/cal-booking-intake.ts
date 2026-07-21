export type CalBookingResponseEntry = {
  label?: string;
  response?: unknown;
  value?: unknown;
  isHidden?: boolean;
};

export type CalBookingData = {
  uid?: string;
  bookingUid?: string;
  type?: string;
  eventType?: {
    slug?: string;
  };
  startTime?: string;
  endTime?: string;
  attendees?: {
    email?: string;
    name?: string;
  }[];
  responses?: Record<string, CalBookingResponseEntry | unknown>;
  userFieldsResponses?: Record<string, unknown>;
  bookingFieldsResponses?: Record<string, unknown>;
};

export type CalBookingIntake = {
  formData: Record<string, unknown>;
  cvFileUrl: string | null;
  sourceMetadata: {
    bookingUid: string | null;
    eventSlug: string | null;
    startTime: string | null;
    endTime: string | null;
    webhookVersion: string | null;
  };
};

const SYSTEM_RESPONSE_KEYS = new Set([
  'guests',
  'location',
  'rescheduleReason',
  'title',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeReadableValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => normalizeReadableValue(item))
      .filter((item) => item !== null);
    return normalized.length > 0 ? normalized : null;
  }

  if (!isRecord(value)) return null;

  const readableLabel = typeof value.label === 'string' ? value.label.trim() : '';
  if (readableLabel && (hasOwn(value, 'id') || hasOwn(value, 'value'))) {
    return readableLabel;
  }

  const normalized = Object.entries(value).reduce<Record<string, unknown>>((result, [key, item]) => {
    const normalizedItem = normalizeReadableValue(item);
    if (normalizedItem !== null) result[key] = normalizedItem;
    return result;
  }, {});

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function unwrapResponseEntry(value: unknown) {
  if (!isRecord(value)) return normalizeReadableValue(value);
  if (value.isHidden === true) return null;
  if (hasOwn(value, 'response')) return normalizeReadableValue(value.response);
  if (hasOwn(value, 'value')) return normalizeReadableValue(value.value);
  return normalizeReadableValue(value);
}

function normalizeFieldKey(key: string) {
  return key === 'name' ? 'fullName' : key;
}

function addResponseValues(
  target: Record<string, unknown>,
  source: Record<string, unknown> | undefined,
  unwrapEntries: boolean,
) {
  for (const [key, entry] of Object.entries(source || {})) {
    if (!key.trim() || SYSTEM_RESPONSE_KEYS.has(key)) continue;
    if (unwrapEntries && isRecord(entry) && entry.isHidden === true) continue;

    const value = unwrapEntries ? unwrapResponseEntry(entry) : normalizeReadableValue(entry);
    if (value !== null) target[normalizeFieldKey(key)] = value;
  }
}

export function normalizeCalBookingResponses(booking: CalBookingData) {
  const normalized: Record<string, unknown> = {};

  addResponseValues(normalized, booking.bookingFieldsResponses, false);
  addResponseValues(normalized, booking.userFieldsResponses, false);
  addResponseValues(normalized, booking.responses as Record<string, unknown> | undefined, true);

  return normalized;
}

function humanizeFieldName(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
}

function isCvField(key: string, entry: unknown) {
  const label = isRecord(entry) && typeof entry.label === 'string' ? entry.label : '';
  const fieldName = `${humanizeFieldName(key)} ${humanizeFieldName(label)}`;
  return /\b(cv|resume|curriculum vitae)\b/i.test(fieldName);
}

function findHttpUrl(value: unknown): string | null {
  if (typeof value === 'string') {
    const match = value.match(/https?:\/\/[^\s"'<>]+/i);
    if (!match) return null;

    try {
      const url = new URL(match[0]);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
    } catch {
      return null;
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = findHttpUrl(item);
      if (url) return url;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  const priorityKeys = ['url', 'downloadUrl', 'fileUrl', 'href', 'response', 'value'];
  for (const key of priorityKeys) {
    if (!hasOwn(value, key)) continue;
    const url = findHttpUrl(value[key]);
    if (url) return url;
  }

  for (const item of Object.values(value)) {
    const url = findHttpUrl(item);
    if (url) return url;
  }

  return null;
}

export function extractCalCvFileUrl(booking: CalBookingData) {
  const responseGroups = [
    booking.bookingFieldsResponses,
    booking.userFieldsResponses,
    booking.responses,
  ];

  for (const group of responseGroups) {
    for (const [key, entry] of Object.entries(group || {})) {
      if (!isCvField(key, entry)) continue;
      const url = findHttpUrl(entry);
      if (url) return url;
    }
  }

  return null;
}

export function buildCalBookingIntake(
  booking: CalBookingData,
  options: { webhookVersion?: string | null } = {},
): CalBookingIntake {
  const formData = normalizeCalBookingResponses(booking);
  const attendee = booking.attendees?.find((item) => item.email || item.name);
  const attendeeName = String(attendee?.name || '').trim();
  const attendeeEmail = String(attendee?.email || '').trim().toLowerCase();

  if (!formData.fullName && attendeeName) formData.fullName = attendeeName;
  if (!formData.email && attendeeEmail) formData.email = attendeeEmail;

  return {
    formData,
    cvFileUrl: extractCalCvFileUrl(booking),
    sourceMetadata: {
      bookingUid: booking.uid || booking.bookingUid || null,
      eventSlug: booking.eventType?.slug || booking.type || null,
      startTime: booking.startTime || null,
      endTime: booking.endTime || null,
      webhookVersion: options.webhookVersion || null,
    },
  };
}
