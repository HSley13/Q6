"""spaCy Chinese NER: extract entities and per-article occurrence counts.

Note: zh_core_web_sm is trained primarily on simplified-Chinese corpora, while
"4G 吃到飽" style queries are Traditional Chinese (Taiwan). Entity quality may
benefit from OpenCC normalization or zh_core_web_trf; left as a known
limitation for this demo (see README).
"""
import logging
from collections import Counter

import spacy
from spacy.language import Language

logger = logging.getLogger(__name__)

# Entity types worth keeping for topic clustering; excludes noisy numeric/date
# labels like DATE, CARDINAL, QUANTITY, PERCENT, TIME, ORDINAL.
KEEP_LABELS = {"ORG", "PRODUCT", "PERSON", "GPE", "LOC", "EVENT", "NORP", "FAC", "WORK_OF_ART"}

_nlp: Language | None = None


def _get_nlp(model_name: str = "zh_core_web_sm") -> Language:
    global _nlp
    if _nlp is None:
        _nlp = spacy.load(model_name)
    return _nlp


def extract_entities(
    text: str,
    model_name: str = "zh_core_web_sm",
    min_length: int = 2,
) -> dict[str, int]:
    """Run NER on `text` and return {entity_text: occurrence_count}."""
    nlp = _get_nlp(model_name)
    doc = nlp(text)

    counts: Counter[str] = Counter()
    for ent in doc.ents:
        entity_text = ent.text.strip()
        if ent.label_ in KEEP_LABELS and len(entity_text) >= min_length:
            counts[entity_text] += 1
    return dict(counts)


def extract_entities_per_article(
    articles: dict[str, str],
    model_name: str = "zh_core_web_sm",
) -> dict[str, dict[str, int]]:
    """Run extract_entities() over every article, keyed by URL."""
    result: dict[str, dict[str, int]] = {}
    for url, text in articles.items():
        entities = extract_entities(text, model_name)
        if entities:
            result[url] = entities
        else:
            logger.info("No entities extracted for %s", url)
    return result
