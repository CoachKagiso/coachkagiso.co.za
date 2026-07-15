import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUTO_TOPIC_FAMILIES,
  AUTO_TOPIC_HISTORY_LIMIT,
  AUTO_TOPIC_HISTORY_WINDOW_MS,
  buildAutoTopicPrompt,
  normalizeAutoTopicHistory,
  parseAutoTopicSuggestion,
  recordAutoTopic,
} from '../lib/content/auto-topic.ts';

test('blank-topic planning excludes a recently used topic family', () => {
  const now = Date.UTC(2026, 6, 15);
  const history = recordAutoTopic([], {
    topic: 'Why keeping your career pivot private is slowing it down',
    family: 'career_pivot',
  }, now);

  const prompt = buildAutoTopicPrompt({
    platform: 'LinkedIn',
    contentType: 'LinkedIn Post',
    angle: 'Conviction Reframe',
    history,
  });

  assert.match(prompt, /career_pivot/i);
  assert.match(prompt, /must not choose/i);
  const allowedFamiliesLine = prompt.split('\n').find((line) => line.startsWith('Allowed topic families:'));
  assert.doesNotMatch(allowedFamiliesLine, /career_pivot/i);
});

test('auto-topic history drops expired and malformed entries', () => {
  const now = Date.UTC(2026, 6, 15);
  const history = normalizeAutoTopicHistory([
    { topic: 'A current visibility topic', family: 'workplace_visibility', createdAt: now - 1_000 },
    { topic: 'An expired pivot topic', family: 'career_pivot', createdAt: now - AUTO_TOPIC_HISTORY_WINDOW_MS - 1 },
    { topic: 'Missing family', createdAt: now },
  ], now);

  assert.deepEqual(history, [
    { topic: 'A current visibility topic', family: 'workplace_visibility', createdAt: now - 1_000 },
  ]);
});

test('auto-topic history retains the newest bounded set of suggestions', () => {
  const now = Date.UTC(2026, 6, 15);
  const history = Array.from({ length: AUTO_TOPIC_HISTORY_LIMIT + 4 }, (_, index) => ({
    topic: `Topic ${index}`,
    family: 'career_clarity',
    createdAt: now - (AUTO_TOPIC_HISTORY_LIMIT + 4 - index),
  }));

  const next = recordAutoTopic(history, {
    topic: 'Newest topic',
    family: 'promotion_growth',
  }, now);

  assert.equal(next.length, AUTO_TOPIC_HISTORY_LIMIT);
  assert.deepEqual(next.at(-1), {
    topic: 'Newest topic',
    family: 'promotion_growth',
    createdAt: now,
  });
});

test('auto-topic suggestions require a valid topic family', () => {
  assert.deepEqual(
    parseAutoTopicSuggestion('{"topic":"How to make your work visible before review season","family":"workplace_visibility"}'),
    {
      topic: 'How to make your work visible before review season',
      family: 'workplace_visibility',
    },
  );
  assert.equal(parseAutoTopicSuggestion('{"topic":"Another pivot post","family":"not_a_family"}'), null);
});

test('auto-topic planning reopens the oldest families after every family was used', () => {
  const history = AUTO_TOPIC_FAMILIES.map((family, index) => ({
    topic: `Topic ${index}`,
    family,
    createdAt: 1_000 + index,
  }));

  const prompt = buildAutoTopicPrompt({
    platform: 'LinkedIn',
    contentType: 'LinkedIn Post',
    angle: 'Quick Lesson',
    history,
  });
  const exclusionLine = prompt.split('\n').find((line) => line.startsWith('Topic families you must not choose:'));
  const allowedFamiliesLine = prompt.split('\n').find((line) => line.startsWith('Allowed topic families:'));

  assert.match(allowedFamiliesLine, /career_pivot/i);
  assert.doesNotMatch(exclusionLine, /career_pivot/i);
});
