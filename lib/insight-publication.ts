export type PublicationTiming = {
  publishAt?: string;
  status?: 'draft' | 'scheduled';
};

/** Missing scheduling fields identify the existing, already-published archive. */
export function isInsightPublished(article: PublicationTiming, now = Date.now()): boolean {
  if (article.status === 'draft') return false;
  if (article.publishAt === undefined) return article.status === undefined;
  const publicationTime = Date.parse(article.publishAt);
  return article.status === 'scheduled' && Number.isFinite(publicationTime) && publicationTime <= now;
}

export function selectPublishedInsights<T extends PublicationTiming>(articles: readonly T[], now = Date.now()): T[] {
  return articles.filter((article) => isInsightPublished(article, now)).sort((a, b) => {
    // Preserve archive order; dated releases are newest first.
    return (b.publishAt ? Date.parse(b.publishAt) : 0) - (a.publishAt ? Date.parse(a.publishAt) : 0);
  });
}
