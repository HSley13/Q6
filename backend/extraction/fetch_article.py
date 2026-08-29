"""Fetch and extract the readable full text of an article URL."""
import logging

import requests
import trafilatura
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}


def fetch_article_text(url: str, timeout: int = 10) -> str:
    """Best-effort extraction of an article's main text.

    Never raises -- a single unreachable or unparsable URL shouldn't take
    down a multi-article pipeline run. Returns "" on any failure.
    """
    try:
        response = requests.get(url, headers=_HEADERS, timeout=timeout)
        response.raise_for_status()
        # Raw bytes, not `.text` -- when a page's Content-Type header omits a
        # charset, requests falls back to decoding as ISO-8859-1 (the HTTP
        # default), which mangles UTF-8 multi-byte text (e.g. Chinese) into
        # mojibake. trafilatura/BeautifulSoup both sniff encoding from the
        # bytes themselves and get it right.
        html = response.content
    except requests.RequestException as exc:
        logger.warning("Failed to fetch %s: %s", url, exc)
        return ""

    text = trafilatura.extract(html, favor_precision=True)
    if text:
        return text

    # Fallback: trafilatura found nothing usable (paywalled/unusual markup) --
    # fall back to concatenating all <p> tag text.
    try:
        soup = BeautifulSoup(html, "html.parser")
        paragraphs = [p.get_text(strip=True) for p in soup.find_all("p")]
        return "\n".join(p for p in paragraphs if p)
    except Exception as exc:  # noqa: BLE001 - best-effort fallback
        logger.warning("Fallback extraction failed for %s: %s", url, exc)
        return ""


def fetch_articles(urls: list[str]) -> dict[str, str]:
    """Fetch article text for each URL, dropping any that yielded nothing."""
    articles: dict[str, str] = {}
    for url in urls:
        text = fetch_article_text(url)
        if text:
            articles[url] = text
        else:
            logger.warning("Skipping %s -- no extractable text", url)
    return articles
