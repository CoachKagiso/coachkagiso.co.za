import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { isInsightPublished, selectPublishedInsights } from '../lib/insight-publication.ts';
import { insights } from '../lib/insights.ts';

const scheduled = JSON.parse(readFileSync(new URL('../lib/scheduled-insights.json', import.meta.url), 'utf8'));
const all = [...insights, ...scheduled];

test('all eight Markdown drafts match the generated site articles', () => {
  execFileSync(process.execPath, ['scripts/build-scheduled-insights.mjs', '--check']);
  assert.equal(scheduled.length, 8);
  assert.equal(new Set(all.map((article) => article.slug)).size, all.length);
});

test('existing archive stays available before the first scheduled release', () => {
  const visible = selectPublishedInsights(all, Date.parse('2026-11-02T00:00:00+02:00'));
  assert.deepEqual(visible, insights);
});

for (const [index, article] of scheduled.entries()) {
  test(`${article.slug}: hidden before 08:00 SAST, visible exactly at release`, () => {
    const release = Date.parse(article.publishAt);
    assert.equal(isInsightPublished(article, release - 1), false);
    assert.equal(isInsightPublished(article, release), true);
    const visible = selectPublishedInsights(all, release);
    assert.equal(visible.length, insights.length + index + 1);
    assert.equal(visible[0].slug, article.slug);
    assert.ok(!visible.some((item) => scheduled.slice(index + 1).some((future) => future.slug === item.slug)));
    assert.equal(new Date(release).getUTCHours(), 6);
  });
}

test('draft, invalid and incomplete scheduled records fail closed', () => {
  const future = Date.parse('2030-01-01T00:00:00Z');
  assert.equal(isInsightPublished({ status: 'draft', publishAt: scheduled[0].publishAt }, future), false);
  assert.equal(isInsightPublished({ status: 'scheduled' }, future), false);
  assert.equal(isInsightPublished({ status: 'scheduled', publishAt: 'invalid' }, future), false);
  assert.equal(isInsightPublished({ publishAt: scheduled[0].publishAt }, future), false);
});

test('release calendar has two first/third Thursday articles per month', () => {
  const counts = {};
  for (const article of scheduled) {
    const month = article.publishAt.slice(0, 7);
    counts[month] = (counts[month] ?? 0) + 1;
    const date = new Date(article.publishAt);
    assert.equal(date.getUTCDay(), 4);
    assert.ok(date.getUTCDate() <= 7 || (date.getUTCDate() >= 15 && date.getUTCDate() <= 21));
  }
  assert.deepEqual(Object.values(counts), [2, 2, 2, 2]);
});

test('articles are complete, have images, and never link to an unreleased companion', () => {
  for (const article of scheduled) {
    const text = JSON.stringify(article.sections);
    assert.ok(text.split(/\s+/).length >= 700, `${article.slug} needs a complete article`);
    assert.ok(!text.includes('\u2014'), `${article.slug} contains an em dash`);
    assert.ok(!/\b(?:TODO|TBD|Lorem ipsum)\b/.test(text));
    assert.ok(existsSync(new URL(`../public${article.image}`, import.meta.url)));
    const headings = article.sections.map((section) => section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    assert.equal(new Set(headings).size, headings.length);
    for (const match of text.matchAll(/\]\(\/insights\/([^\s)]+)\)/g)) {
      const target = all.find((item) => item.slug === match[1]);
      assert.ok(target, `Missing companion: ${match[1]}`);
      assert.ok(isInsightPublished(target, Date.parse(article.publishAt)), `Future link from ${article.slug} to ${target.slug}`);
    }
  }
});
