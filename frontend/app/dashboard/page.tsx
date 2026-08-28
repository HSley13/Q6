import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { groupByCluster } from "@/lib/aggregate";
import { createClient } from "@/lib/supabase/server";
import type { SerpEntityRow } from "@/types/entities";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("serp_entities")
    .select("*")
    .order("cluster_id", { ascending: true });

  const rows = (data ?? []) as SerpEntityRow[];
  const clustered = groupByCluster(rows);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Entity Clusters</h1>
        <LogoutButton />
      </div>

      {error && <p className="text-sm text-red-600">Failed to load entity data: {error.message}</p>}
      {!error && clustered.length === 0 && (
        <p className="text-sm text-slate-600">
          No entity data yet — run the backend pipeline for a keyword to populate this dashboard.
        </p>
      )}

      {clustered.length > 0 && <p className="text-sm text-slate-600">{clustered.length} clustered entities loaded.</p>}
    </main>
  );
}
