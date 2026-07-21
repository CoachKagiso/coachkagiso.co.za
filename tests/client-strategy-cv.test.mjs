import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractSupabaseStorageLocation,
  isAllowedClientStrategyCvUrl,
  redactClientStrategySourceText,
  sanitizeClientStrategyIntake,
} from '../lib/client-strategy-cv.ts';

test('allows only the configured Supabase host and Cal.com file hosts', () => {
  const supabaseUrl = 'https://project-ref.supabase.co';

  assert.equal(
    isAllowedClientStrategyCvUrl('https://project-ref.supabase.co/storage/v1/object/sign/client-uploads/cv/client.pdf', supabaseUrl),
    true,
  );
  assert.equal(isAllowedClientStrategyCvUrl('https://files.cal.com/client.pdf', supabaseUrl), true);
  assert.equal(isAllowedClientStrategyCvUrl('https://cal.com/client.pdf', supabaseUrl), true);
  assert.equal(isAllowedClientStrategyCvUrl('http://files.cal.com/client.pdf', supabaseUrl), false);
  assert.equal(isAllowedClientStrategyCvUrl('https://files.cal.com.evil.example/client.pdf', supabaseUrl), false);
  assert.equal(isAllowedClientStrategyCvUrl('https://127.0.0.1/client.pdf', supabaseUrl), false);
});

test('extracts a private Supabase storage bucket and object path without retaining the token', () => {
  assert.deepEqual(
    extractSupabaseStorageLocation(
      'https://project-ref.supabase.co/storage/v1/object/sign/client-uploads/career-clarity/client.pdf?token=private',
      'https://project-ref.supabase.co',
    ),
    {
      bucket: 'client-uploads',
      path: 'career-clarity/client.pdf',
    },
  );
});

test('removes contact and high-risk identity details before AI drafting', () => {
  assert.equal(
    redactClientStrategySourceText(
      'Email: lerato@example.com\nPhone: +27 82 123 4567\nID number: 9001015009087\nLed a cross-functional rollout.',
    ),
    'Email: [redacted]\nPhone: [redacted]\nID number: [redacted]\nLed a cross-functional rollout.',
  );

  assert.deepEqual(
    sanitizeClientStrategyIntake({
      fullName: 'Lerato Molefe',
      email: 'lerato@example.com',
      phoneNumber: '+27 82 123 4567',
      homeAddress: 'Private address',
      careerGoal: 'Move into product operations',
      targetRoles: ['Product Operations Manager', 'Programme Manager'],
    }),
    {
      careerGoal: 'Move into product operations',
      targetRoles: ['Product Operations Manager', 'Programme Manager'],
    },
  );
});

