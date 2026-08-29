import { useEffect, useState } from "react";
import { ClusterChart } from "@/components/ClusterChart";
import { LogoutButton } from "@/components/LogoutButton";
import { groupByCluster } from "@/lib/aggregate";
import { supabase } from "@/lib/supabaseClient";
import type { ClusteredEntity, SerpEntityRow } from "@/types/entities";

export function DashboardPage() {
  const [clustered, setClustered] = useState<ClusteredEntity[]>([]);
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
          setClustered(groupByCluster((data ?? []) as SerpEntityRow[]));
        }
        setLoading(false);
      });
  }, []);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Entity Clusters</h1>
        <LogoutButton />
      </div>

      {loading && <p className="text-sm text-slate-600">Loading...</p>}
      {error && <p className="text-sm text-red-600">Failed to load entity data: {error}</p>}
      {!loading && !error && clustered.length === 0 && (
        <p className="text-sm text-slate-600">
          No entity data yet — run the backend pipeline for a keyword to populate this dashboard.
        </p>
      )}

      {clustered.length > 0 && <ClusterChart data={clustered} />}
    </main>
  );
}
