"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ClusteredEntity } from "@/types/entities";

// Validated categorical palette (dataviz skill reference/palette.md) --
// fixed slot order, never cycled to a generated hue past 8 series.
const CLUSTER_COLORS_LIGHT = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
];
const CLUSTER_COLORS_DARK = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];

function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  return isDark;
}

function clusterColor(clusterId: number, isDark: boolean): string {
  const palette = isDark ? CLUSTER_COLORS_DARK : CLUSTER_COLORS_LIGHT;
  return palette[clusterId % palette.length];
}

type ClusterChartProps = {
  data: ClusteredEntity[];
  maxEntities?: number;
};

export function ClusterChart({ data, maxEntities = 40 }: ClusterChartProps) {
  const isDark = useIsDarkMode();
  const chartData = data.slice(0, maxEntities);
  const clusterIds = Array.from(new Set(data.map((d) => d.cluster_id))).sort((a, b) => a - b);

  const mutedInk = "#898781";
  const gridline = isDark ? "#2c2c2a" : "#e1e0d9";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        {clusterIds.map((id) => (
          <span key={id} className="flex items-center gap-1.5 text-sm text-slate-600">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: clusterColor(id, isDark) }}
            />
            Cluster {id}
          </span>
        ))}
      </div>

      <div style={{ height: Math.max(chartData.length * 28, 240) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 24, right: 24, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridline} horizontal={false} />
            <XAxis type="number" allowDecimals={false} stroke={mutedInk} tick={{ fill: mutedInk, fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="entity"
              width={140}
              stroke={mutedInk}
              tick={{ fill: mutedInk, fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number, _name, item) => [value, `Cluster ${item.payload.cluster_id}`]}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
              {chartData.map((entry) => (
                <Cell key={`${entry.cluster_id}-${entry.entity}`} fill={clusterColor(entry.cluster_id, isDark)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="text-sm text-slate-600">
        <summary className="cursor-pointer select-none">View as table</summary>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-1 pr-4">Entity</th>
              <th className="py-1 pr-4">Cluster</th>
              <th className="py-1">Count</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={`${row.cluster_id}-${row.entity}`} className="border-b border-slate-100">
                <td className="py-1 pr-4">{row.entity}</td>
                <td className="py-1 pr-4">{row.cluster_id}</td>
                <td className="py-1">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
