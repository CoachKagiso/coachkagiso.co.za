export const CLIENT_STRATEGY_SERVICE_SLUGS = ['career-clarity', 'glow-up-vip'] as const;
export const CLIENT_CV_SERVICE_SLUGS = ['cv-review', 'cv-revamp', 'cover-letter', 'linkedin', 'bundle'] as const;
export const CLIENT_STRATEGY_WORKSPACE_VIEWS = ['context', 'cv', 'prep', 'strategy'] as const;
export const CLIENT_IDENTITY_INTAKE_KEYS = ['fullName', 'email', 'phone', 'whatsapp', 'attendeePhoneNumber', 'attendeePhone', 'telephone'] as const;
export const CAREER_CLARITY_INTAKE_ORDER = [
  'cvNoted',
  'notes',
  'currentRole',
  'skillStrength',
  'clarityQuestion',
  'clarityGoal',
  'previousAttempts',
  'alreadyTried',
  'stuckScale',
  'additionalInfo',
  'additionalContext',
] as const;
export const CLIENT_STRATEGY_REOPEN_WINDOW_DAYS = 30;

export type ClientStrategyServiceSlug = (typeof CLIENT_STRATEGY_SERVICE_SLUGS)[number];
export type ClientCvServiceSlug = (typeof CLIENT_CV_SERVICE_SLUGS)[number];
export type ClientStrategyWorkspaceView = (typeof CLIENT_STRATEGY_WORKSPACE_VIEWS)[number];
export type ClientIntakeCardGroup = 'identity' | 'context';
export type ClientWorkspaceAccessStatus = 'active' | 'recently-completed' | 'archived' | 'ineligible';
export type ClientWorkspaceAccess = {
  status: ClientWorkspaceAccessStatus;
  daysRemaining: number | null;
  selectable: boolean;
  canUseCvAnalyzer: boolean;
  canUseStrategyTab: boolean;
};

function normalizedIntakeKey(key: string) {
  return key.replace(/[_\-\s]/g, '').toLowerCase();
}

type ClientWorkspaceAccessInput = {
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
    label: 'What shifted in the session',
    prompt: 'Capture what became clearer, changed, or moved forward in the conversation.',
  },
  {
    key: 'commitments',
    label: 'Commitments made',
    prompt: 'Record the commitments made by the client and by Kagiso in one shared field.',
  },
  {
    key: 'sensitivityNotes',
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

export function isClientCvServiceSlug(value: unknown): value is ClientCvServiceSlug {
  return CLIENT_CV_SERVICE_SLUGS.includes(value as ClientCvServiceSlug);
}

export function normalizeClientStrategyWorkspaceView(value: unknown): ClientStrategyWorkspaceView {
  return CLIENT_STRATEGY_WORKSPACE_VIEWS.includes(value as ClientStrategyWorkspaceView)
    ? value as ClientStrategyWorkspaceView
    : 'context';
}

export function getClientIntakeCardGroup(key: string): ClientIntakeCardGroup {
  const normalizedKey = normalizedIntakeKey(key);
  return CLIENT_IDENTITY_INTAKE_KEYS.some((candidate) => normalizedIntakeKey(candidate) === normalizedKey) ? 'identity' : 'context';
}

export function orderClientIntakeKeys(keys: string[]) {
  const identityOrder = new Map<string, number>(CLIENT_IDENTITY_INTAKE_KEYS.map((key, index) => [normalizedIntakeKey(key), index]));
  const contextOrder = new Map<string, number>(CAREER_CLARITY_INTAKE_ORDER.map((key, index) => [normalizedIntakeKey(key), index]));

  return [...keys].sort((left, right) => {
    const leftGroup = getClientIntakeCardGroup(left);
    const rightGroup = getClientIntakeCardGroup(right);
    if (leftGroup !== rightGroup) return leftGroup === 'identity' ? -1 : 1;

    const leftOrder = leftGroup === 'identity' ? identityOrder.get(normalizedIntakeKey(left)) : contextOrder.get(normalizedIntakeKey(left));
    const rightOrder = rightGroup === 'identity' ? identityOrder.get(normalizedIntakeKey(right)) : contextOrder.get(normalizedIntakeKey(right));
    if (leftOrder !== undefined && rightOrder !== undefined && leftOrder !== rightOrder) return leftOrder - rightOrder;
    if (leftOrder !== undefined) return -1;
    if (rightOrder !== undefined) return 1;
    return 0;
  });
}

export function getClientStrategyAccess(
  client: ClientWorkspaceAccessInput,
  options: { requireCoachingService?: boolean } = {},
  now = new Date(),
): ClientWorkspaceAccess {
  const isCoachingService = isClientStrategyServiceSlug(client.serviceSlug);
  const isCvService = isClientCvServiceSlug(client.serviceSlug);

  if (!isCoachingService && !isCvService) {
    return {
      status: 'ineligible',
      daysRemaining: null,
      selectable: false,
      canUseCvAnalyzer: false,
      canUseStrategyTab: false,
    };
  }

  if (options.requireCoachingService && !isCoachingService) {
    return {
      status: 'ineligible',
      daysRemaining: null,
      selectable: false,
      canUseCvAnalyzer: false,
      canUseStrategyTab: false,
    };
  }

  if (isCvService) {
    return {
      status: 'active',
      daysRemaining: null,
      selectable: true,
      canUseCvAnalyzer: true,
      canUseStrategyTab: false,
    };
  }

  if (!client.isDelivered) {
    return {
      status: 'active',
      daysRemaining: null,
      selectable: true,
      canUseCvAnalyzer: true,
      canUseStrategyTab: true,
    };
  }

  const deliveredAt = client.deliveredAt ? Date.parse(client.deliveredAt) : Number.NaN;
  const nowTime = now.getTime();
  if (!Number.isFinite(deliveredAt) || !Number.isFinite(nowTime)) {
    return {
      status: 'archived',
      daysRemaining: 0,
      selectable: false,
      canUseCvAnalyzer: false,
      canUseStrategyTab: false,
    };
  }

  const availableUntil = deliveredAt + (CLIENT_STRATEGY_REOPEN_WINDOW_DAYS * DAY_IN_MILLISECONDS);
  if (nowTime > availableUntil) {
    return {
      status: 'archived',
      daysRemaining: 0,
      selectable: false,
      canUseCvAnalyzer: false,
      canUseStrategyTab: false,
    };
  }

  return {
    status: 'recently-completed',
    daysRemaining: Math.min(
      CLIENT_STRATEGY_REOPEN_WINDOW_DAYS,
      Math.max(0, Math.ceil((availableUntil - nowTime) / DAY_IN_MILLISECONDS)),
    ),
    selectable: true,
    canUseCvAnalyzer: true,
    canUseStrategyTab: true,
  };
}


export function buildClientStrategyClientChoiceLabel(
  client: ClientStrategyChoiceInput,
  access: ClientWorkspaceAccess,
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

export function buildClientStrategyWorkspaceHref(
  adminKey: string,
  paymentId: string,
  view?: ClientStrategyWorkspaceView,
) {
  const params = new URLSearchParams();
  if (adminKey && adminKey !== 'dashboard-session') params.set('key', adminKey);
  params.set('tab', 'career-tools');
  params.set('client', paymentId);
  if (view) params.set('view', view);
  return `/resources/career-diagnostic/submissions?${params.toString()}`;
}
