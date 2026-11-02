import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'content/insights');
const schedule = JSON.parse(readFileSync(path.join(directory, 'schedule.json'), 'utf8'));
const slugs = new Set();

// Deliberately small authoring format: H1 title, H2 sections, paragraphs and lists.
// Fail on unsupported markup so an editor never silently loses formatting.
const articles = schedule.map(({ file, ...metadata }) => {
  if (!/^[a-z0-9-]+\.md$/.test(file)) throw new Error(`Invalid article file: ${file}`);
  if (!/^[a-z0-9-]+$/.test(metadata.slug) || slugs.has(metadata.slug)) {
    throw new Error(`Invalid or duplicate slug: ${metadata.slug}`);
  }
  slugs.add(metadata.slug);
  if (!['draft', 'scheduled'].includes(metadata.status)) throw new Error(`Invalid status: ${file}`);
  if (!/^\d{4}-\d{2}-\d{2}T08:00:00\+02:00$/.test(metadata.publishAt) || !Number.isFinite(Date.parse(metadata.publishAt))) {
    throw new Error(`Use an explicit 08:00 SAST publication date: ${file}`);
  }
  if (!existsSync(path.join(root, 'public', metadata.image))) throw new Error(`Missing image: ${file}`);
  const markdown = readFileSync(path.join(directory, file), 'utf8').replace(/\r\n/g, '\n').trim();
  if (markdown.includes('\u2014')) throw new Error(`Em dash in ${file}`);
  const [heading, ...rest] = markdown.split('\n');
  if (!heading.startsWith('# ')) throw new Error(`Missing article title: ${file}`);
  const title = heading.slice(2);
  const sections = [{ heading: 'Start here', body: [] }];
  for (const paragraph of rest.join('\n').trim().split(/\n\s*\n/)) {
    if (paragraph.startsWith('## ')) {
      if (paragraph.includes('\n')) throw new Error(`Separate headings with a blank line: ${file}`);
      sections.push({ heading: paragraph.slice(3), body: [] });
    } else if (/^(?:#|>|```|\|)/m.test(paragraph)) {
      throw new Error(`Unsupported Markdown block in ${file}`);
    } else if (paragraph.startsWith('- ')) {
      const lines = paragraph.split('\n');
      if (lines.some((line) => !line.startsWith('- '))) throw new Error(`Malformed list: ${file}`);
      sections.at(-1).body.push({ type: 'list', items: lines.map((line) => line.slice(2)) });
    } else {
      sections.at(-1).body.push(paragraph);
    }
  }
  if (sections.some((section) => !section.body.length)) throw new Error(`Empty section: ${file}`);
  const words = markdown.split(/\s+/).length;
  return {
    ...metadata,
    title,
    // The root metadata template appends the brand once.
    metaTitle: title,
    metaDescription: metadata.dek,
    date: new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Johannesburg' }).format(new Date(metadata.publishAt)),
    readTime: `${Math.ceil(words / 200)} min read`,
    sections,
  };
});

const output = `${JSON.stringify(articles, null, 2)}\n`;
const target = path.join(root, 'lib/scheduled-insights.json');
if (process.argv.includes('--check')) {
  if (!existsSync(target) || readFileSync(target, 'utf8') !== output) {
    throw new Error('Scheduled article output is stale. Run node scripts/build-scheduled-insights.mjs.');
  }
  console.log(`Verified ${articles.length} scheduled articles match their Markdown sources.`);
} else {
  writeFileSync(target, output);
  console.log(`Built ${articles.length} scheduled articles.`);
}
