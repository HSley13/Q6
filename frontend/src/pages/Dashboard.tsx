import { useEffect, useState } from "react";
import { ArticleBreakdown } from "@/components/ArticleBreakdown";
import { ClusterChart } from "@/components/ClusterChart";
import { LogoutButton } from "@/components/LogoutButton";
import { groupByArticle, groupByCluster } from "@/lib/aggregate";
import { supabase } from "@/lib/supabaseClient";
import type { ArticleBreakdown as ArticleBreakdownType, ClusteredEntity, SerpEntityRow } from "@/types/entities";

type View = "cluster" | "article";

export function DashboardPage() {
  const [clustered, setClustered] = useState<ClusteredEntity[]>([]);
  const [byArticle, setByArticle] = useState<ArticleBreakdownType[]>([]);
  const [view, setView] = useState<View>("cluster");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("serp_entities")
      .select("*")
      .order("cluster_id", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          const rows = (data ?? []) as SerpEntityRow[];
          setClustered(groupByCluster(rows));
          setByArticle(groupByArticle(rows));
        }
        setLoading(false);
      });
  }, []);

  const hasData = clustered.length > 0;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Entity Clusters</h1>
        <LogoutButton />
      </div>

      {loading && <p className="text-sm text-slate-600">Loading...</p>}
      {error && <p className="text-sm text-red-600">Failed to load entity data: {error}</p>}
      {!loading && !error && !hasData && (
        <p className="text-sm text-slate-600">
          No entity data yet — run the backend pipeline for a keyword to populate this dashboard.
        </p>
      )}

      {hasData && (
        <>
          <div className="flex gap-4 border-b border-slate-200 text-sm">
            <button
              onClick={() => setView("cluster")}
              className={`-mb-px border-b-2 px-1 py-2 ${
                view === "cluster" ? "border-slate-900 font-medium" : "border-transparent text-slate-500"
              }`}
            >
              By topic cluster
            </button>
            <button
              onClick={() => setView("article")}
              className={`-mb-px border-b-2 px-1 py-2 ${
                view === "article" ? "border-slate-900 font-medium" : "border-transparent text-slate-500"
              }`}
            >
              By article ({byArticle.length})
            </button>
          </div>

          {view === "cluster" && <ClusterChart data={clustered} />}
          {view === "article" && <ArticleBreakdown articles={byArticle} />}
        </>
      )}
    </main>
  );
}
