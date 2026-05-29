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
