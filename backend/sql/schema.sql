-- Run this in the Supabase SQL editor (or `supabase db push`) before the
-- pipeline's first write.

create table if not exists public.serp_entities (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  url text not null,
  entity text not null,
  count integer not null default 1,
  cluster_id integer,
  created_at timestamptz not null default now()
);

create index if not exists serp_entities_query_idx on public.serp_entities (query);
create index if not exists serp_entities_cluster_idx on public.serp_entities (cluster_id);

alter table public.serp_entities enable row level security;

-- Only logged-in users can read results; the RLS default-deny means
-- unauthenticated (anon) reads return zero rows.
create policy "Authenticated users can read entities"
  on public.serp_entities
  for select
  to authenticated
  using (true);

-- Deliberately no insert/update/delete policy for anon or authenticated:
-- all writes happen via the service-role key from the Python pipeline,
-- which bypasses RLS entirely.
