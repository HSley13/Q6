"""End-to-end CLI: SERP scrape -> article fetch -> NER -> clustering -> Supabase.

Usage:
    python -m backend.pipeline --keyword "4G 吃到飽"
"""
import argparse
import logging

from backend.clustering.embed_cluster import cluster_entities
from backend.extraction.fetch_article import fetch_articles
from backend.extraction.ner_extractor import extract_entities_per_article
from backend.serp.scraper import fetch_serp_results
from backend.storage.writer import build_rows, clear_query, write_entities

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def run(keyword: str, num_results: int = 10, n_clusters: int = 8, gl: str = "tw", hl: str = "zh-tw") -> None:
    logger.info("Fetching SERP results for %r", keyword)
    results = fetch_serp_results(keyword, num_results, gl, hl)
    urls = [r["url"] for r in results]
    logger.info("Got %d SERP results", len(urls))

    articles = fetch_articles(urls)
    logger.info("Fetched %d/%d articles successfully", len(articles), len(urls))

    per_article_entities = extract_entities_per_article(articles)
    all_entities = sorted({entity for ents in per_article_entities.values() for entity in ents})
    logger.info("Extracted %d unique entities", len(all_entities))

    cluster_map = cluster_entities(all_entities, n_clusters=n_clusters)

    rows = build_rows(keyword, per_article_entities, cluster_map)
    clear_query(keyword)
    write_entities(rows)
    logger.info("Wrote %d rows to Supabase for query %r", len(rows), keyword)

    top_entities = sorted(
        ((entity, sum(ents.get(entity, 0) for ents in per_article_entities.values())) for entity in all_entities),
        key=lambda pair: pair[1],
        reverse=True,
    )[:10]
    logger.info("Top entities: %s", top_entities)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the SERP entity analysis pipeline")
    parser.add_argument("--keyword", required=True, help="Search keyword, e.g. '4G 吃到飽'")
    parser.add_argument("--num-results", type=int, default=10)
    parser.add_argument("--n-clusters", type=int, default=8)
    parser.add_argument("--gl", default="tw")
    parser.add_argument("--hl", default="zh-tw")
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    run(args.keyword, args.num_results, args.n_clusters, args.gl, args.hl)


if __name__ == "__main__":
    main()
