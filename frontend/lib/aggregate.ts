import type { ClusteredEntity, SerpEntityRow } from "@/types/entities";

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
