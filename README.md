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

## Repo layout

```
backend/
  serp/scraper.py            SerpApi query for a keyword's top organic results
  extraction/fetch_article.py  article full-text fetch (trafilatura + BS4 fallback)
  extraction/ner_extractor.py  spaCy Chinese NER, per-article entity counts
  clustering/embed_cluster.py  sentence-transformers embeddings + KMeans
  storage/writer.py            flatten results into rows, write to Supabase
  sql/schema.sql               serp_entities table + RLS policy
  pipeline.py                  CLI wiring the above end to end
frontend/
  app/login, app/dashboard     Supabase Auth login + protected dashboard
  components/ClusterChart.tsx  entities-by-cluster bar chart (recharts)
  lib/supabase/                browser/server Supabase clients
  middleware.ts                session refresh + dashboard route guard
```

## Backend setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download zh_core_web_sm
```

Copy `.env.example` to `.env` in the repo root and fill in:

- `SERPAPI_API_KEY` — from serpapi.com
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — from your Supabase project's API settings (service role key, **not** the anon key — this is what lets the pipeline bypass RLS to write)

Apply the schema once, before the first pipeline run: paste `backend/sql/schema.sql`
into the Supabase SQL editor (or run it via `supabase db push` if you're using the CLI).

Run the pipeline for any keyword:

```bash
python -m backend.pipeline --keyword "4G 吃到飽"
```

Re-running for the same keyword replaces its rows (`clear_query` + insert), so it's safe to iterate.

Run the backend smoke tests:

```bash
pytest backend/tests
```

### Known limitation

`zh_core_web_sm` is trained primarily on simplified-Chinese corpora, while
"4G 吃到飽"-style queries are Traditional Chinese (Taiwan). Entity extraction quality may benefit from
adding OpenCC normalization or switching to `zh_core_web_trf`; left as a follow-up rather than solved here.

## Frontend setup

```bash
cd frontend
npm install
```

Copy `.env.example`'s frontend vars into `frontend/.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Create a login user (Supabase dashboard → Authentication → Users → Add user, or sign up from
the app's `/login` page — it defaults to email/password sign-up).

```bash
npm run dev
```

Visit `http://localhost:3000` — you'll be redirected to `/login`, then to `/dashboard` after
signing in, where entity clusters for any keyword you've run through the backend pipeline appear
as a bar chart grouped by cluster.

## Deployment

- **Backend**: run `backend/pipeline.py` wherever convenient (local cron, a scheduled GitHub Action,
  etc.) — it's a one-shot CLI, not a long-running service.
- **Frontend**: push `frontend/` to Vercel (set the project root to `frontend/` if deploying the
  whole repo), and set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` as Vercel
  environment variables.
- **Supabase**: RLS on `serp_entities` only grants `select` to `authenticated` users — writes always
  go through the service-role key from the backend, never from the browser.
