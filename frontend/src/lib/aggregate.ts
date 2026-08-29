import type { ArticleBreakdown, ClusteredEntity, SerpEntityRow } from "@/types/entities";

/**
 * Sums counts for the same entity across multiple article URLs and groups
 * by cluster, sorted by cluster then descending frequency.
 */
export function groupByCluster(rows: SerpEntityRow[]): ClusteredEntity[] {
  const totals = new Map<string, ClusteredEntity>();

  for (const row of rows) {
    if (row.cluster_id === null) continue;

    const key = `${row.cluster_id}:${row.entity}`;
    const existing = totals.get(key);
    if (existing) {
      existing.count += row.count;
    } else {
      totals.set(key, { cluster_id: row.cluster_id, entity: row.entity, count: row.count });
    }
  }

  return Array.from(totals.values()).sort((a, b) =>
    a.cluster_id !== b.cluster_id ? a.cluster_id - b.cluster_id : b.count - a.count,
  );
}

/**
 * Groups rows by source article (url), each with its own entity list and
 * per-entity counts -- the per-article breakdown that a query-wide cluster
 * total can't show, since summing across articles loses which article each
 * mention came from.
 */
export function groupByArticle(rows: SerpEntityRow[]): ArticleBreakdown[] {
  const byUrl = new Map<string, ArticleBreakdown>();

  for (const row of rows) {
    let article = byUrl.get(row.url);
    if (!article) {
      article = { url: row.url, entities: [], uniqueEntityCount: 0, totalMentionCount: 0 };
      byUrl.set(row.url, article);
    }
    article.entities.push({ entity: row.entity, count: row.count, cluster_id: row.cluster_id });
    article.totalMentionCount += row.count;
  }

  const articles = Array.from(byUrl.values());
  for (const article of articles) {
    article.entities.sort((a, b) => b.count - a.count);
    article.uniqueEntityCount = article.entities.length;
  }

  return articles.sort((a, b) => b.totalMentionCount - a.totalMentionCount);
}
