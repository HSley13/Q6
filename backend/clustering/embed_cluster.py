"""Embed extracted entities and cluster them into topics with KMeans."""
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans

# Multilingual model -- needed since entities are Traditional Chinese strings.
_DEFAULT_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"

_model: SentenceTransformer | None = None


def _get_model(model_name: str = _DEFAULT_MODEL) -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(model_name)
    return _model


def embed_entities(entities: list[str], model_name: str = _DEFAULT_MODEL) -> np.ndarray:
    model = _get_model(model_name)
    return model.encode(entities)


def cluster_entities(
    entities: list[str],
    n_clusters: int = 8,
    random_state: int = 42,
) -> dict[str, int]:
    """Cluster unique entities into topics, returning {entity: cluster_id}.

    Caps n_clusters at the number of unique entities so KMeans doesn't error
    out on small result sets.
    """
    unique_entities = sorted(set(entities))
    if not unique_entities:
        return {}

    effective_clusters = min(n_clusters, len(unique_entities))
    embeddings = embed_entities(unique_entities)
    labels = KMeans(
        n_clusters=effective_clusters,
        random_state=random_state,
        n_init="auto",
    ).fit_predict(embeddings)

    return {entity: int(label) for entity, label in zip(unique_entities, labels)}
