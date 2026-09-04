import assert from 'node:assert/strict';
import test from 'node:test';

import { enforceHumanizer, getHumanizerRulesBlock } from '../lib/content/humanizer.ts';

test('the prompt block bans engagement bait', () => {
  const block = getHumanizerRulesBlock('write_post');
  assert.ok(block.includes('Reshare with a friend'), 'bait regex must be in the checklist');
  assert.equal(getHumanizerRulesBlock('auto_topic'), '', 'non-prose modes stay lean');
});

test('enforceHumanizer removes engagement-bait sentences', () => {
  const input = 'A strong opening line here. Reshare with a friend who is job hunting. Save this for later. The insight stands on its own.';
  const { text, changes } = enforceHumanizer(input);
  assert.ok(!/reshare|save this for later/i.test(text), 'bait must be gone');
  assert.ok(text.includes('A strong opening line here.'), 'real content survives');
  assert.ok(text.includes('The insight stands on its own.'), 'real content survives');
  assert.equal(changes.find((c) => c.pattern === 'engagement_bait')?.count, 2);
});

test('enforceHumanizer swaps banned vocab for neutral words', () => {
  const { text } = enforceHumanizer('Leverage your network to unlock growth. Time to delve deeper.');
  assert.ok(!/\bleverage\b|\bunlock\b|\bdelve\b/i.test(text), 'banned words must be gone');
  assert.ok(text.includes('Influence your network'), 'capitalization preserved');
  assert.ok(text.includes('open growth'), 'unlock -> open');
  assert.ok(text.includes('explore deeper'), 'delve -> explore');
});

test('enforceHumanizer repairs dashes without touching clean text', () => {
  const dirty = 'She paused — then spoke. A — B.';
  const { text } = enforceHumanizer(dirty);
  assert.ok(!/[—–]/.test(text), 'no dashes survive');
  const clean = 'Short sentences. One clear insight.';
  assert.equal(enforceHumanizer(clean).text, clean, 'clean text passes through untouched');
  assert.equal(enforceHumanizer(clean).changes.length, 0, 'no phantom changes reported');
});

test('enforceHumanizer joins rule-of-three fragment runs', () => {
  const { text } = enforceHumanizer('The industry. The level. The game. Real change takes longer.');
  assert.ok(!/The industry\. The level\. The game\./.test(text), 'staccato triplet must be joined');
  assert.ok(text.includes('Real change takes longer.'), 'surrounding prose survives');
});

test('LinkedIn output keeps paragraph breaks with at most 2 sentences each', () => {
  const paragraphs = [
    'Nobody told you your LinkedIn headline was the problem. But it is.',
    'I teach my clients to read their own profile like a stranger would. Most flinch at the first line.',
    'The headline carries the whole first impression. The experience section only confirms it.',
    'Recruiters decide in seconds. Give them one clear reason to keep reading.',
    'Start with the outcome you create. End the line with who it is for.',
    'Reshare with a friend who is job hunting. Small edits compound into callbacks.',
    'Which line on your profile are you rewriting first?',
  ];
  const { text } = enforceHumanizer(paragraphs.join('\n\n'));
  const breaks = (text.match(/\n\n/g) || []).length;
  assert.ok(breaks >= 5, `expected >=5 double newlines, got ${breaks}`);
  for (const paragraph of text.split(/\n{2,}/)) {
    const sentences = paragraph.split(/(?<=[.!?…])\s+/).filter((s) => s.trim());
    assert.ok(sentences.length <= 2, `paragraph exceeds 2 sentences: ${paragraph.slice(0, 60)}`);
  }
  assert.ok(!/reshare with a friend/i.test(text), 'bait sentence removed, breaks intact');

  const wall = 'First sentence here. Second sentence here. Third sentence here. Fourth sentence here. Fifth sentence here. Sixth sentence here.';
  const repaired = enforceHumanizer(wall).text;
  assert.ok((repaired.match(/\n\n/g) || []).length >= 2, 'wall of text must gain breathing space');
});
