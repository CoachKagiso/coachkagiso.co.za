export const CLIENT_STRATEGY_SERVICE_SLUGS = ['career-clarity', 'glow-up-vip'] as const;
export const CLIENT_STRATEGY_REOPEN_WINDOW_DAYS = 30;

export type ClientStrategyServiceSlug = (typeof CLIENT_STRATEGY_SERVICE_SLUGS)[number];
export type ClientStrategyAccessStatus = 'active' | 'recently-completed' | 'archived' | 'ineligible';
export type ClientStrategyAccess = {
  status: ClientStrategyAccessStatus;
  daysRemaining: number | null;
};

type ClientStrategyAccessInput = {
  serviceSlug: string;
  isDelivered: boolean;
  deliveredAt: string | null;
};

type ClientStrategyChoiceInput = {
  buyerName: string;
  serviceName: string;
  isTest: boolean;
};

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export const SESSION_DEBRIEF_FIELDS = [
  {
    key: 'clarityShift',
    label: 'What changed or became clearer',
    prompt: 'Capture the shift in direction, confidence, language, or priorities that happened in the session.',
  },
  {
    key: 'blockers',
    label: 'Key blockers or risks',
    prompt: 'Name the patterns, constraints, missing evidence, or practical risks that could slow the client down.',
  },
  {
    key: 'strengthsEvidence',
    label: 'Strengths and proof surfaced',
    prompt: 'Record concrete examples, achievements, responsibilities, or signals the client can use as evidence.',
  },
  {
    key: 'decisions',
    label: 'Decisions made',
    prompt: 'Record the direction, priorities, boundaries, and trade-offs agreed during the session.',
  },
  {
    key: 'clientCommitments',
    label: 'Client commitments',
    prompt: 'List what the client agreed to complete, test, send, or decide next.',
  },
  {
    key: 'coachCommitments',
    label: 'Kagiso commitments',
    prompt: 'List the resources, feedback, introductions, or follow-up Kagiso agreed to provide.',
  },
  {
    key: 'toneNotes',
    label: 'Tone or sensitivity notes',
    prompt: 'Capture anything the follow-up should handle carefully, including confidence, urgency, or personal context.',
  },
] as const;

export type SessionDebriefFieldKey = (typeof SESSION_DEBRIEF_FIELDS)[number]['key'];
export type SessionDebrief = Record<SessionDebriefFieldKey, string>;

export type ClientStrategyWorkspaceRecord = {
  id: string;
  paymentId: string;
  serviceSlug: ClientStrategyServiceSlug;
  status: 'draft';
  debrief: SessionDebrief;
  version: number;
  createdAt: string;
  updatedAt: string;
};

const SESSION_DEBRIEF_FIELD_LIMIT = 4000;

export function isClientStrategyServiceSlug(value: unknown): value is ClientStrategyServiceSlug {
  return CLIENT_STRATEGY_SERVICE_SLUGS.includes(value as ClientStrategyServiceSlug);
}

export function getClientStrategyAccess(
  client: ClientStrategyAccessInput,
  now = new Date(),
): ClientStrategyAccess {
  if (!isClientStrategyServiceSlug(client.serviceSlug)) {
    return { status: 'ineligible', daysRemaining: null };
  }

  if (!client.isDelivered) {
    return { status: 'active', daysRemaining: null };
  }

  const deliveredAt = client.deliveredAt ? Date.parse(client.deliveredAt) : Number.NaN;
  const nowTime = now.getTime();
  if (!Number.isFinite(deliveredAt) || !Number.isFinite(nowTime)) {
    return { status: 'archived', daysRemaining: 0 };
  }

  const availableUntil = deliveredAt + (CLIENT_STRATEGY_REOPEN_WINDOW_DAYS * DAY_IN_MILLISECONDS);
  if (nowTime > availableUntil) {
    return { status: 'archived', daysRemaining: 0 };
  }

  return {
    status: 'recently-completed',
    daysRemaining: Math.min(
      CLIENT_STRATEGY_REOPEN_WINDOW_DAYS,
      Math.max(0, Math.ceil((availableUntil - nowTime) / DAY_IN_MILLISECONDS)),
    ),
  };
}

export function buildClientStrategyClientChoiceLabel(
  client: ClientStrategyChoiceInput,
  access: ClientStrategyAccess,
) {
  let accessLabel = 'Unavailable';
  if (access.status === 'active') {
    accessLabel = 'Active';
  } else if (access.status === 'recently-completed') {
    accessLabel = access.daysRemaining === 0
      ? 'Recently completed, expires today'
      : `Recently completed, ${access.daysRemaining} day${access.daysRemaining === 1 ? '' : 's'} left`;
  } else if (access.status === 'archived') {
    accessLabel = 'Archived';
  }

  return `${accessLabel}: ${client.buyerName} - ${client.serviceName}${client.isTest ? ' - TEST' : ''}`;
}

export function createEmptySessionDebrief(): SessionDebrief {
  return SESSION_DEBRIEF_FIELDS.reduce<SessionDebrief>((result, field) => {
    result[field.key] = '';
    return result;
  }, {} as SessionDebrief);
}

export function normalizeSessionDebrief(value: unknown): SessionDebrief {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return SESSION_DEBRIEF_FIELDS.reduce<SessionDebrief>((result, field) => {
    const normalized = String(source[field.key] || '').trim();
    if (normalized.length > SESSION_DEBRIEF_FIELD_LIMIT) {
      throw new Error(`${field.label} must be ${SESSION_DEBRIEF_FIELD_LIMIT} characters or fewer.`);
    }
    result[field.key] = normalized;
    return result;
  }, {} as SessionDebrief);
}

export function countCompletedDebriefFields(debrief: SessionDebrief) {
  return SESSION_DEBRIEF_FIELDS.filter((field) => debrief[field.key].trim()).length;
}

export function getClientStrategyPlanLabel(serviceSlug: ClientStrategyServiceSlug) {
  return serviceSlug === 'career-clarity' ? '14-day follow-up' : '30-day support plan';
}

export function buildClientStrategyWorkspaceHref(adminKey: string, paymentId: string) {
  const params = new URLSearchParams();
  if (adminKey && adminKey !== 'dashboard-session') params.set('key', adminKey);
  params.set('tab', 'career-tools');
  params.set('client', paymentId);
  return `/resources/career-diagnostic/submissions?${params.toString()}`;
}
