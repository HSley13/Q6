# 4G 吃到飽 — SERP Entity Analysis

SERP scraping → entity extraction → topic clustering → Supabase storage → Vercel visualization (with login).

Given a keyword (e.g. `4G 吃到飽`), this project pulls Google's top organic results via SerpApi,
extracts named entities from each article with spaCy's Chinese NER model, clusters those entities
into topics with sentence-transformers + KMeans, stores the results in Supabase, and displays them
in a login-gated Next.js dashboard.

## Architecture

```
SerpApi (SERP scraping)
  -> article fetch (trafilatura)
    -> spaCy zh NER (per-article entity counts)
      -> sentence-transformers embeddings -> KMeans clustering
        -> Supabase (serp_entities table)
          -> Next.js + Supabase Auth dashboard (chart by cluster)
```

More setup and deployment details will be added as the pipeline and frontend are built out.
