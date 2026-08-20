import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTemplateFillPrompt,
  countPlaceholders,
  normaliseTemplate,
  parseTemplateSlides,
  splitRebuildOutput,
} from '../lib/content/carousel-template.ts';

const rebuild = `PLATFORM: LinkedIn | PILLAR: Personal Brand & Visibility | WRITING REGISTER: Tactical Teacher

Slide 1: Everyone treats "fix your CV" like it is settled.

Slide 2: Lead with proof, not duties.

--- REUSABLE TEMPLATE ---
SLIDE 1 - cover
Everyone treats [COMMON ADVICE IN YOUR FIELD] like it is settled.

Almost no one shows you [THE PART THAT TAKES WORK].

SLIDE 2 - step
1. [PRINCIPLE NAME]

[ONE BOLD RULE]`;

test('the finished post and the template are separated', () => {
  const { post, template } = splitRebuildOutput(rebuild);
  assert.match(post, /PLATFORM: LinkedIn/);
  assert.match(post, /fix your CV/);
  assert.ok(!post.includes('COMMON ADVICE'), 'the post must not carry template brackets');
  assert.match(template, /SLIDE 1 - cover/);
  assert.ok(!template.includes('PLATFORM: LinkedIn'), 'the template must not carry the post');
});

test('a rebuild with no template leaves the post whole', () => {
  const { post, template } = splitRebuildOutput('Just a text post, no deck.');
  assert.equal(post, 'Just a text post, no deck.');
  assert.equal(template, '');
});

test('the heading is matched even when the model varies the dashes', () => {
  const { template } = splitRebuildOutput('Post body\nREUSABLE TEMPLATE\nSLIDE 1 - cover\nHello [X]');
  assert.match(template, /SLIDE 1 - cover/);
});

test('template slides are split on their headings', () => {
  const slides = parseTemplateSlides(splitRebuildOutput(rebuild).template);
  assert.equal(slides.length, 2);
  assert.equal(slides[0].label, 'SLIDE 1 - cover');
  assert.match(slides[0].content, /COMMON ADVICE IN YOUR FIELD/);
  assert.equal(slides[1].label, 'SLIDE 2 - step');
});

test('a bold or hashed heading is still recognised', () => {
  const slides = parseTemplateSlides('**SLIDE 1 - cover**\nbody here\n## SLIDE 2 - cta\nclose here');
  assert.equal(slides.length, 2);
  assert.equal(slides[1].label, 'SLIDE 2 - cta');
});

test('an unheaded template is kept rather than thrown away', () => {
  const slides = parseTemplateSlides('Everyone treats [X] like it is settled.');
  assert.equal(slides.length, 1);
  assert.equal(slides[0].label, 'Template');
});

test('normaliseTemplate rejects empty input', () => {
  assert.equal(normaliseTemplate(''), null);
  assert.equal(normaliseTemplate('   '), null);
  assert.ok(normaliseTemplate('SLIDE 1 - cover\nHello [X]'));
});

test('placeholders are counted, which is what makes a mould reusable', () => {
  assert.equal(countPlaceholders('[ONE] and [TWO] and [THREE]'), 3);
  assert.equal(countPlaceholders('no brackets here'), 0);
});

test('the fill prompt forbids leaving any bracket behind', () => {
  const prompt = buildTemplateFillPrompt({
    template: 'SLIDE 1 - cover\n[COMMON ADVICE]',
    topic: 'Why your CV is not getting interviews',
    label: 'Authority deconstruction',
    pillar: 'Personal Brand & Visibility',
    slideArc: ['cover', 'step', 'cta'],
  });
  assert.match(prompt, /No bracket may remain/);
  assert.match(prompt, /Why your CV is not getting interviews/);
  assert.match(prompt, /cover -> step -> cta/);
  assert.match(prompt, /Authority deconstruction/);
});
