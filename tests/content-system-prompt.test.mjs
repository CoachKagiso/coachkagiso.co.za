import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSystemPrompt } from '../lib/content/system-prompt.ts';
import { splitTopicAndStrategicNote } from '../lib/content/utils.ts';

const BASE_CONTEXT = {
  topArchetype: 'Lost Pivoter',
  strongestTheme: 'invisible at work',
  leadsThisWeek: 4,
  topService: 'Career Diagnostic',
  hotLeadsCount: 1,
  commonAnxieties: ['applying with no callback'],
};

function writePost(overrides = {}) {
  return buildSystemPrompt(
    'write_post',
    overrides.context ?? BASE_CONTEXT,
    'linkedin_post',
    null,
    overrides.angle ?? 'quick_lesson',
    overrides.register ?? 'tactical_teacher',
    undefined,
    undefined,
    overrides.topicHint,
  );
}

test('the CTA ladder is gone from the assembled prompt', () => {
  const prompt = writePost();
  assert.ok(!prompt.includes('Reshare with a friend who is job hunting'), 'ladder must be deleted');
  assert.ok(!prompt.includes('Follow for practical tips daily'), 'ladder must be deleted');
  // The ban list names the phrases so the model avoids them - but the chained
  // instruction form must be gone.
  assert.ok(!prompt.includes('Save this for later. Follow'), 'chained CTA instruction must be gone');
});

test('banned closings are listed in the write_post rules', () => {
  const prompt = writePost();
  assert.ok(prompt.includes('BANNED CLOSINGS'), 'closings block must exist');
  assert.ok(prompt.includes('Save this for later'), 'specific bait named');
});

test('readability targets Grade 6-8, not Grade 2-5', () => {
  const prompt = writePost();
  assert.ok(prompt.includes('Grade 6-8'), 'new target present');
  assert.ok(!prompt.includes('Target Grade 2-5'), 'old target gone');
});

test('number hooks are optional, not mandatory', () => {
  const prompt = writePost();
  assert.ok(prompt.includes('Do not force one into every post'), 'hooks must read as optional');
  assert.ok(!prompt.includes('Every post must use 1'), 'mandatory hook gone');
});

test('tender topics soften Contrarian Take into Hot Observation', () => {
  const softened = writePost({
    angle: 'contrarian_take',
    register: 'conviction_reframe',
    topicHint: 'The Moment You Realise You Outgrew The Job',
  });
  assert.ok(softened.includes('hot_observation'), 'angle must remap');
  assert.ok(softened.includes('softened to Hot Observation'), 'guard note must explain why');

  const untouched = writePost({ angle: 'contrarian_take', register: 'conviction_reframe' });
  assert.ok(!untouched.includes('hot_observation'), 'no topic, no remap');

  const wrongRegister = writePost({
    angle: 'contrarian_take',
    register: 'tactical_teacher',
    topicHint: 'stuck and feeling invisible',
  });
  assert.ok(!wrongRegister.includes('hot_observation'), 'guard only fires for conviction_reframe');
});

test('generic anxiety stubs resolve to specific fears', () => {
  const prompt = writePost({ context: { ...BASE_CONTEXT, commonAnxieties: ['job hunting'] } });
  assert.ok(prompt.includes('fear of being seen as ungrateful'), 'fallback must replace the stub');
  assert.ok(!prompt.includes('Recent common anxieties from diagnostics: job hunting'), 'stub must not survive');

  const specific = writePost();
  assert.ok(specific.includes('applying with no callback'), 'real anxieties pass through untouched');
});

test('dashboard signals and pillar rule survive the rewrite', () => {
  const prompt = writePost();
  assert.ok(prompt.includes('LIVE DASHBOARD SIGNALS'), 'context block included');
  assert.ok(prompt.includes('Lost Pivoter'), 'archetype flows through');
  assert.ok(prompt.includes('do not default to Career Growth'), 'pillar rule kept');
  assert.ok(prompt.includes('STRATEGIC NOTE'), 'strategic-note rule documented');
});

test('registers carry DO/DONT structure, not just openers', () => {
  const prompt = writePost({ register: 'conviction_reframe' });
  assert.ok(prompt.includes('FEELING TO NAME'), 'feeling block present');
  assert.ok(prompt.includes('outgrowing is data, not disloyalty'), 'reframe language present');
});

test('topic sanitization splits meta-notes from the writable topic', () => {
  const leaky = splitTopicAndStrategicNote(
    'The Moment You Outgrew The Job. Positions Kagiso as the coach for pivots. This is original ideation.',
  );
  assert.equal(leaky.cleanTopic, 'The Moment You Outgrew The Job.');
  assert.ok(leaky.strategicNote.includes('Positions Kagiso as'), 'note retains the positioning');

  const clean = splitTopicAndStrategicNote('A plain topic with no meta-notes.');
  assert.equal(clean.cleanTopic, 'A plain topic with no meta-notes.');
  assert.equal(clean.strategicNote, '');
});
