"""Flatten pipeline results into rows and persist them to Supabase."""
from backend.storage.supabase_client import get_supabase_client

TABLE_NAME = "serp_entities"


def build_rows(
    query: str,
    per_article_entities: dict[str, dict[str, int]],
    cluster_map: dict[str, int],
) -> list[dict]:
    """Flatten {url: {entity: count}} + {entity: cluster_id} into DB rows."""
    rows: list[dict] = []
    for url, entity_counts in per_article_entities.items():
        for entity, count in entity_counts.items():
            rows.append(
                {
                    "query": query,
                    "url": url,
                    "entity": entity,
                    "count": count,
                    "cluster_id": cluster_map.get(entity),
                }
            )
    return rows


def clear_query(query: str) -> None:
    """Delete existing rows for `query` so re-running the pipeline is idempotent."""
    get_supabase_client().table(TABLE_NAME).delete().eq("query", query).execute()


def write_entities(rows: list[dict]) -> None:
    if not rows:
        return
    get_supabase_client().table(TABLE_NAME).insert(rows).execute()
