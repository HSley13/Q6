"""spaCy Chinese NER: extract entities and per-article occurrence counts.

zh_core_web_sm is trained on Simplified Chinese and segments Traditional
input (e.g. "4G 吃到飽" style Taiwan text) poorly -- it cuts words at the
wrong boundaries, producing garbage fragments ("查詢台", "擔心現", ")係")
instead of real entities. Converting to Simplified for the NER pass only,
then converting each extracted entity back to Traditional for display,
fixes segmentation without switching models. As a side effect it also
normalizes Traditional character variants (e.g. 臺灣/台灣) to one form.
"""
import logging
import re
from collections import Counter

import spacy
from opencc import OpenCC
from spacy.language import Language

logger = logging.getLogger(__name__)

# Entity types worth keeping for topic clustering; excludes noisy numeric/date
# labels like DATE, CARDINAL, QUANTITY, PERCENT, TIME, ORDINAL.
KEEP_LABELS = {"ORG", "PRODUCT", "PERSON", "GPE", "LOC", "EVENT", "NORP", "FAC", "WORK_OF_ART"}

# Strips stray leading/trailing punctuation spaCy occasionally includes at a
# span boundary (e.g. a lone "）" or "（" caught at the edge of an entity).
_EDGE_PUNCT = re.compile(r"^[\W_]+|[\W_]+$", re.UNICODE)

_nlp: Language | None = None
_t2s = OpenCC("t2s")
_s2t = OpenCC("s2t")


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
    doc = nlp(_t2s.convert(text))

    counts: Counter[str] = Counter()
    for ent in doc.ents:
        if ent.label_ not in KEEP_LABELS:
            continue
        entity_text = _EDGE_PUNCT.sub("", _s2t.convert(ent.text.strip()))
        if len(entity_text) >= min_length:
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
