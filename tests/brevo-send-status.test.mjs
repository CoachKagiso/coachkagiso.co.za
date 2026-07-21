import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyBrevoSendResult } from '../lib/brevo-send-result.ts';

test('distinguishes retryable Brevo rejection from uncertain acceptance', async () => {
  assert.deepEqual(
    classifyBrevoSendResult({ responsePresent: false, responseOk: false }),
    { outcome: 'unavailable' },
  );
  assert.deepEqual(
    classifyBrevoSendResult({ responsePresent: true, responseOk: false }),
    { outcome: 'rejected' },
  );
  assert.deepEqual(
    classifyBrevoSendResult({ responsePresent: true, responseOk: true }),
    { outcome: 'uncertain' },
  );
  assert.deepEqual(
    classifyBrevoSendResult({ responsePresent: true, responseOk: true, messageId: 'brevo-message-1' }),
    { outcome: 'accepted', messageId: 'brevo-message-1' },
  );
});
