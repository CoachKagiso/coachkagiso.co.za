import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_BACKLOG_EMAILS_PER_WINDOW,
  SENDING_WINDOWS,
  planBacklogSendSchedule,
} from '../lib/email-send-windows.ts';

function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

test('returns nothing for an empty backlog', () => {
  assert.deepEqual(planBacklogSendSchedule(0, new Date('2026-08-20T06:00:00')), []);
});

test('fills the next window first and spaces the sends apart', () => {
  const now = new Date('2026-08-20T06:00:00');
  const plan = planBacklogSendSchedule(3, now, DEFAULT_BACKLOG_EMAILS_PER_WINDOW);

  assert.equal(plan.length, 3);
  assert.equal(minutesOfDay(plan[0]), SENDING_WINDOWS[0].totalMinutes);
  assert.ok(plan[1].getTime() > plan[0].getTime());
  assert.ok(plan[2].getTime() > plan[1].getTime());
  assert.equal(plan[2].getDate(), now.getDate());
});

test('rolls into the following window once one is full', () => {
  const now = new Date('2026-08-20T06:00:00');
  const plan = planBacklogSendSchedule(4, now, 2);

  assert.equal(minutesOfDay(plan[0]), SENDING_WINDOWS[0].totalMinutes);
  assert.equal(minutesOfDay(plan[2]), SENDING_WINDOWS[1].totalMinutes);
});

test('skips windows that have already passed today', () => {
  const now = new Date('2026-08-20T13:00:00');
  const plan = planBacklogSendSchedule(1, now);

  assert.equal(minutesOfDay(plan[0]), SENDING_WINDOWS[2].totalMinutes);
  assert.equal(plan[0].getDate(), now.getDate());
});

test('rolls over to tomorrow when the day is spent', () => {
  const now = new Date('2026-08-20T19:00:00');
  const plan = planBacklogSendSchedule(1, now);

  assert.equal(minutesOfDay(plan[0]), SENDING_WINDOWS[0].totalMinutes);
  assert.equal(plan[0].getDate(), now.getDate() + 1);
});

test('never schedules a send in the past', () => {
  const now = new Date('2026-08-20T07:29:00');
  const plan = planBacklogSendSchedule(6, now, 2);

  for (const scheduledAt of plan) {
    assert.ok(scheduledAt.getTime() > now.getTime(), `${scheduledAt.toISOString()} is not in the future`);
  }
});

test('spreads a large backlog across several days', () => {
  const now = new Date('2026-08-20T06:00:00');
  const plan = planBacklogSendSchedule(20, now, 3);

  assert.equal(plan.length, 20);
  const days = new Set(plan.map((date) => date.getDate()));
  assert.ok(days.size >= 3, 'expected the backlog to span multiple days');
});
