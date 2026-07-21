import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCalBookingIntake,
  extractCalCvFileUrl,
  normalizeCalBookingResponses,
} from '../lib/cal-booking-intake.ts';

test('normalizes current response values and legacy value fallbacks', () => {
  const responses = normalizeCalBookingResponses({
    responses: {
      careerGoal: {
        label: 'What do you want to change?',
        response: 'Move into product operations',
        value: 'This legacy value must not win',
        isHidden: false,
      },
      confidenceBlocker: {
        label: 'What is getting in the way?',
        value: 'I struggle to explain my transferable experience',
        isHidden: false,
      },
      internalOnly: {
        label: 'Internal only',
        response: 'Do not persist this',
        isHidden: true,
      },
    },
  });

  assert.deepEqual(responses, {
    careerGoal: 'Move into product operations',
    confidenceBlocker: 'I struggle to explain my transferable experience',
  });
});

test('merges v2 booking field responses and turns selected options into readable values', () => {
  const responses = normalizeCalBookingResponses({
    bookingFieldsResponses: {
      targetRoles: ['Product Operations Manager', 'Programme Manager'],
    },
    responses: {
      preferredSupport: {
        response: [
          { id: 'option-1', label: 'Accountability' },
          { id: 'option-2', label: 'CV positioning' },
        ],
      },
    },
  });

  assert.deepEqual(responses, {
    targetRoles: ['Product Operations Manager', 'Programme Manager'],
    preferredSupport: ['Accountability', 'CV positioning'],
  });
});

test('extracts only a CV or resume field URL', () => {
  const booking = {
    bookingFieldsResponses: {
      linkedInUrl: 'https://www.linkedin.com/in/client-name',
      cvUpload: {
        fileName: 'client-cv.pdf',
        url: 'https://files.cal.com/client-cv.pdf',
      },
    },
  };

  assert.equal(extractCalCvFileUrl(booking), 'https://files.cal.com/client-cv.pdf');
});

test('builds visible intake answers separately from booking metadata', () => {
  const intake = buildCalBookingIntake(
    {
      uid: 'cal-booking-123',
      type: 'career-clarity',
      startTime: '2026-07-21T08:00:00.000Z',
      endTime: '2026-07-21T09:15:00.000Z',
      attendees: [{ name: 'Lerato Molefe', email: 'LERATO@example.com' }],
      responses: {
        currentSituation: {
          label: 'What is happening in your career right now?',
          response: 'I have outgrown my role and do not know which move to make next.',
        },
      },
    },
    { webhookVersion: '2021-10-20' },
  );

  assert.deepEqual(intake.formData, {
    currentSituation: 'I have outgrown my role and do not know which move to make next.',
    fullName: 'Lerato Molefe',
    email: 'lerato@example.com',
  });
  assert.deepEqual(intake.sourceMetadata, {
    bookingUid: 'cal-booking-123',
    eventSlug: 'career-clarity',
    startTime: '2026-07-21T08:00:00.000Z',
    endTime: '2026-07-21T09:15:00.000Z',
    webhookVersion: '2021-10-20',
  });
  assert.equal(intake.cvFileUrl, null);
});
