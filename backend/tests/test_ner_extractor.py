import pytest

spacy = pytest.importorskip("spacy")


def _model_available(model_name: str) -> bool:
    try:
        spacy.load(model_name)
        return True
    except OSError:
        return False


@pytest.mark.skipif(not _model_available("zh_core_web_sm"), reason="zh_core_web_sm not installed")
def test_extract_entities_filters_and_counts():
    from backend.extraction.ner_extractor import extract_entities

    text = "台灣大哥大推出4G吃到飽方案，台灣大哥大也提供5G升級。"
    entities = extract_entities(text)

    assert isinstance(entities, dict)
    for entity, count in entities.items():
        assert len(entity) >= 2
        assert count >= 1
