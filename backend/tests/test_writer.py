from backend.storage.writer import build_rows


def test_build_rows_flattens_and_joins_cluster_ids():
    per_article_entities = {
        "https://a.example/1": {"台灣大哥大": 3, "5G": 1},
        "https://b.example/2": {"台灣大哥大": 1},
    }
    cluster_map = {"台灣大哥大": 0, "5G": 1}

    rows = build_rows("4G 吃到飽", per_article_entities, cluster_map)

    assert len(rows) == 3
    assert {
        "query": "4G 吃到飽",
        "url": "https://a.example/1",
        "entity": "台灣大哥大",
        "count": 3,
        "cluster_id": 0,
    } in rows
    assert {
        "query": "4G 吃到飽",
        "url": "https://b.example/2",
        "entity": "台灣大哥大",
        "count": 1,
        "cluster_id": 0,
    } in rows


def test_build_rows_handles_entity_missing_from_cluster_map():
    rows = build_rows("kw", {"https://a.example": {"unclustered": 2}}, {})
    assert rows == [
        {"query": "kw", "url": "https://a.example", "entity": "unclustered", "count": 2, "cluster_id": None}
    ]


def test_build_rows_empty_input():
    assert build_rows("kw", {}, {}) == []
