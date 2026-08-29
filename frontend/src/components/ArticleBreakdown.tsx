import type { ArticleBreakdown as ArticleBreakdownType } from "@/types/entities";

type ArticleBreakdownProps = {
  articles: ArticleBreakdownType[];
};

export function ArticleBreakdown({ articles }: ArticleBreakdownProps) {
  return (
    <div className="flex flex-col gap-3">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-1 pr-4">Article</th>
            <th className="py-1 pr-4">Unique entities</th>
            <th className="py-1">Total mentions</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => (
            <tr key={article.url} className="border-b border-slate-100 align-top">
              <td className="py-1 pr-4">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline break-all"
                >
                  {article.url}
                </a>
              </td>
              <td className="py-1 pr-4">{article.uniqueEntityCount}</td>
              <td className="py-1">{article.totalMentionCount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {articles.map((article) => (
        <details key={article.url} className="text-sm text-slate-600">
          <summary className="cursor-pointer select-none break-all">
            {article.url} — {article.uniqueEntityCount} entities
          </summary>
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-1 pr-4">Entity</th>
                <th className="py-1 pr-4">Cluster</th>
                <th className="py-1">Count in this article</th>
              </tr>
            </thead>
            <tbody>
              {article.entities.map((e) => (
                <tr key={e.entity} className="border-b border-slate-100">
                  <td className="py-1 pr-4">{e.entity}</td>
                  <td className="py-1 pr-4">{e.cluster_id ?? "—"}</td>
                  <td className="py-1">{e.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ))}
    </div>
  );
}
