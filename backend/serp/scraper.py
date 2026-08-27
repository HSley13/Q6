"""Fetch Google's first-page organic results for an arbitrary keyword via SerpApi.

The keyword is always supplied by the caller (CLI arg or function argument) --
it is never hardcoded, so this module can be reused for any query.
"""
import argparse
import json

from serpapi import GoogleSearch

from backend.config import SERPAPI_API_KEY


def fetch_serp_results(
    keyword: str,
    num_results: int = 10,
    gl: str = "tw",
    hl: str = "zh-tw",
) -> list[dict]:
    """Query SerpApi for the top organic Google results for `keyword`.

    Returns a list of {"rank", "title", "url", "snippet"} dicts, capped at
    `num_results`.
    """
    params = {
        "engine": "google",
        "q": keyword,
        "google_domain": "google.com.tw",
        "gl": gl,
        "hl": hl,
        "num": num_results,
        "api_key": SERPAPI_API_KEY,
    }
    response = GoogleSearch(params).get_dict()

    if "error" in response:
        raise RuntimeError(f"SerpApi error for query {keyword!r}: {response['error']}")

    organic_results = response.get("organic_results", [])
    return [
        {
            "rank": i,
            "title": item.get("title", ""),
            "url": item.get("link", ""),
            "snippet": item.get("snippet", ""),
        }
        for i, item in enumerate(organic_results[:num_results], start=1)
        if item.get("link")
    ]


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch top Google SERP results for a keyword")
    parser.add_argument("--keyword", required=True, help="Search keyword, e.g. '4G 吃到飽'")
    parser.add_argument("--num-results", type=int, default=10)
    parser.add_argument("--gl", default="tw", help="Google country code")
    parser.add_argument("--hl", default="zh-tw", help="Google interface language")
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    results = fetch_serp_results(args.keyword, args.num_results, args.gl, args.hl)
    print(json.dumps(results, ensure_ascii=False, indent=2))
