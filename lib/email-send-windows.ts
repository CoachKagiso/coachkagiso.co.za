export const SENDING_WINDOWS = [
  { label: 'Morning', time: '7:30 AM', hour: 7, minute: 30, totalMinutes: 7 * 60 + 30 },
  { label: 'Lunch', time: '12:30 PM', hour: 12, minute: 30, totalMinutes: 12 * 60 + 30 },
  { label: 'After work', time: '5:30 PM', hour: 17, minute: 30, totalMinutes: 17 * 60 + 30 },
] as const;

export type RecommendedSendWindow = (typeof SENDING_WINDOWS)[number];
export type NextRecommendedSendWindow = Pick<RecommendedSendWindow, 'label' | 'time' | 'hour' | 'minute'> & {
  tomorrow: boolean;
};

export function isWithinRecommendedSendWindow(now: Date) {
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  return SENDING_WINDOWS.some((window) => totalMinutes >= window.totalMinutes - 30 && totalMinutes <= window.totalMinutes + 30);
}

export function getNextRecommendedSendWindow(now: Date): NextRecommendedSendWindow {
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const nextToday = SENDING_WINDOWS.find((window) => window.totalMinutes > totalMinutes + 30);
  const window = nextToday || SENDING_WINDOWS[0];

  return {
    label: window.label,
    time: window.time,
    hour: window.hour,
    minute: window.minute,
    tomorrow: !nextToday,
  };
}

export function getScheduledSendDate(now: Date, window: NextRecommendedSendWindow) {
  const scheduledAt = new Date(now);
  if (window.tomorrow) scheduledAt.setDate(scheduledAt.getDate() + 1);
  scheduledAt.setHours(window.hour, window.minute, 0, 0);
  return scheduledAt;
}

export function getSendWindowGuidance(now: Date) {
  const withinWindow = isWithinRecommendedSendWindow(now);
  const nextWindow = getNextRecommendedSendWindow(now);
  return {
    withinWindow,
    nextWindow,
    scheduledAt: getScheduledSendDate(now, nextWindow),
  };
}

export function getScheduledSendSummary(window: NextRecommendedSendWindow) {
  return `${window.label} at ${window.time}${window.tomorrow ? ' tomorrow' : ''}`;
}

export const DEFAULT_BACKLOG_EMAILS_PER_WINDOW = 5;
const MINIMUM_SCHEDULE_LEAD_MINUTES = 5;
const BACKLOG_SPACING_MINUTES = 4;

function getWindowStart(day: Date, window: RecommendedSendWindow) {
  const start = new Date(day);
  start.setHours(window.hour, window.minute, 0, 0);
  return start;
}

/**
 * Spreads a backlog across the recommended sending windows instead of firing
 * everything at once. Each window takes `perWindow` emails, spaced a few minutes
 * apart, and windows that have already passed roll over to the next day.
 */
export function planBacklogSendSchedule(
  count: number,
  now = new Date(),
  perWindow = DEFAULT_BACKLOG_EMAILS_PER_WINDOW,
) {
  const total = Math.max(0, Math.floor(count));
  const slotsPerWindow = Math.max(1, Math.floor(perWindow));
  const earliest = new Date(now.getTime() + MINIMUM_SCHEDULE_LEAD_MINUTES * 60 * 1000);
  const scheduled: Date[] = [];

  let dayOffset = 0;
  while (scheduled.length < total && dayOffset < 30) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);

    for (const window of SENDING_WINDOWS) {
      if (scheduled.length >= total) break;
      const start = getWindowStart(day, window);
      if (start.getTime() < earliest.getTime()) continue;

      for (let slot = 0; slot < slotsPerWindow && scheduled.length < total; slot += 1) {
        scheduled.push(new Date(start.getTime() + slot * BACKLOG_SPACING_MINUTES * 60 * 1000));
      }
    }

    dayOffset += 1;
  }

  return scheduled;
}

export function describeScheduledSend(value: Date) {
  return new Intl.DateTimeFormat('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value);
}
