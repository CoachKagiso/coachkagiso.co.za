import 'server-only';
import { insights, type Insight } from './insights';
import { selectPublishedInsights } from './insight-publication';
import scheduledArticles from './scheduled-insights.json';

// Keep future article bodies on the server, outside public client bundles.
const allInsights: Insight[] = [...insights, ...(scheduledArticles as Insight[])];

export function getPublishedInsights(now = Date.now()): Insight[] {
  const published = selectPublishedInsights(allInsights, now);
  if (!published[0]?.publishAt) return published;
  return published.map((article, index) => ({ ...article, featured: index === 0 }));
}

export function getInsightBySlug(slug: string, now = Date.now()) {
  return getPublishedInsights(now).find((article) => article.slug === slug);
}

export function getRelatedInsights(slug: string, limit = 3, now = Date.now()) {
  const published = getPublishedInsights(now);
  const current = published.find((article) => article.slug === slug);
  return published
    .filter((article) => article.slug !== slug)
    .sort((a, b) => {
      const aMatches = a.tags.filter((tag) => current?.tags.includes(tag)).length;
      const bMatches = b.tags.filter((tag) => current?.tags.includes(tag)).length;
      return bMatches - aMatches;
    })
    .slice(0, limit);
}
