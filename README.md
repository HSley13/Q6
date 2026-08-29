# 4G 吃到飽 — SERP Entity Analysis

SERP scraping → entity extraction → topic clustering → Supabase storage → Vercel visualization (with login).

Given a keyword (e.g. `4G 吃到飽`), this project pulls Google's top organic results via SerpApi,
extracts named entities from each article with spaCy's Chinese NER model, clusters those entities
into topics with sentence-transformers + KMeans, stores the results in Supabase, and displays them
in a login-gated React (Vite) dashboard.

## Architecture

```
SerpApi (SERP scraping)
  -> article fetch (trafilatura)
    -> spaCy zh NER (per-article entity counts)
      -> sentence-transformers embeddings -> KMeans clustering
        -> Supabase (serp_entities table)
          -> React (Vite) + Supabase Auth dashboard (chart by cluster)
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
  src/pages/Login.tsx, Dashboard.tsx    Supabase Auth login + protected dashboard
  src/components/ClusterChart.tsx      entities-by-cluster bar chart (recharts)
  src/components/ArticleBreakdown.tsx  per-article entity + count table
  src/components/ProtectedRoute.tsx    client-side route guard (redirects to /login)
  src/lib/supabaseClient.ts            Supabase JS client
  src/lib/useAuth.tsx                  auth session context/hook
  vercel.json                          SPA rewrite (all routes -> index.html)
appscript/
  Code.gs                       standalone Google Sheets/Apps Script version (SerpApi + Gemini -> Sheet)
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

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Create a login user (Supabase dashboard → Authentication → Users → Add user, or sign up from
the app's `/login` page — it defaults to email/password sign-up).

```bash
npm run dev
```

Visit `http://localhost:5173` — you'll be redirected to `/login`, then to `/dashboard` after
signing in. Two views of the same data: **By topic cluster** (bar chart grouped by cluster) and
**By article** (per-article table — which of the top-10 articles each entity came from, its count
in that specific article, and each article's unique-entity / total-mention totals).

Route protection is client-side (`ProtectedRoute` checks the Supabase session and redirects);
the actual data access control is enforced by Postgres RLS regardless of what the UI does, so this
is not a weaker security model than a server-rendered guard, just a differently-shaped one.

## Google Sheets / Apps Script version

`appscript/Code.gs` is a self-contained alternative that needs none of the above — no Python,
no Supabase, no Vercel. Same keyword-driven SERP → entity → topic pipeline, but it calls the
Gemini API for entity extraction + topic labeling (instead of spaCy + sentence-transformers,
which can't run inside Apps Script) and writes results straight into the Sheet.

Setup:

1. Open a Google Sheet → Extensions → Apps Script → paste in `appscript/Code.gs`.
2. Get a Gemini API key at https://aistudio.google.com/apikey (free tier, no GCP billing setup
   needed) and reuse your existing SerpApi key.
3. Reload the Sheet, use the new menu **SERP Entity Analysis → Set API Keys**, enter both.
4. **SERP Entity Analysis → Run Analysis**, enter a keyword when prompted (e.g. `4G 吃到飽`).

Writes three tabs: **Results** (rank, article, entity, topic, count-in-that-article — one row per
entity per article), **Per-Article Summary** (unique-entity / total-mention count per article),
and **Run Info** (keyword + timestamp). "Login" for this version is Google's own Sheet-sharing
permissions — share the Sheet with specific people rather than "Anyone with the link".

I can't execute Apps Script myself to test it the way I ran the Python pipeline locally — test it
in the Apps Script editor and send me any error from the execution log if something breaks.

## Deployment

- **Backend**: `.github/workflows/serp-pipeline.yml` runs the pipeline on a daily cron (03:00 UTC)
  and can also be triggered manually from the Actions tab with a custom `keyword` input. Add these
  as repo secrets (Settings → Secrets and variables → Actions) for it to work: `SERPAPI_API_KEY`,
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Frontend**: it's a static SPA (Vite build output in `frontend/dist`). Push `frontend/` to Vercel
  (set the project root to `frontend/` if deploying the whole repo, build command `npm run build`,
  output directory `dist`), and set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as Vercel
  environment variables. `frontend/vercel.json` rewrites all paths to `index.html` so client-side
  routes (`/login`, `/dashboard`) survive a hard refresh.
- **Supabase**: RLS on `serp_entities` only grants `select` to `authenticated` users — writes always
  go through the service-role key from the backend, never from the browser.
