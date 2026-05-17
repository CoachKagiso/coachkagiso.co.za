export type DashboardCalendarView = 'month' | 'week' | 'day';

export type DashboardCalendarEventType =
  | 'session'
  | 'delivery'
  | 'follow_up'
  | 'masterclass'
  | 'personal'
  | 'content'
  | 'task'
  | 'other';

export type DashboardCalendarEventSource =
  | 'google'
  | 'delivery_deadline'
  | 'follow_up'
  | 'task'
  | 'check_in';

export type DashboardCalendarEvent = {
  id: string;
  source: DashboardCalendarEventSource;
  googleEventId?: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay?: boolean;
  type: DashboardCalendarEventType;
  readOnly: boolean;
  isCalBooking: boolean;
  linkHref?: string;
  linkLabel?: string;
  location?: string;
};

export type DashboardCalendarEventPayload = {
  key: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  eventType: DashboardCalendarEventType;
  description?: string;
  linkedLeadId?: string | null;
};
