export type SerpEntityRow = {
  id: string;
  query: string;
  url: string;
  entity: string;
  count: number;
  cluster_id: number | null;
  created_at: string;
};

export type ClusteredEntity = {
  cluster_id: number;
  entity: string;
  count: number;
};

export type ArticleEntity = {
  entity: string;
  count: number;
  cluster_id: number | null;
};

export type ArticleBreakdown = {
  url: string;
  entities: ArticleEntity[];
  uniqueEntityCount: number;
  totalMentionCount: number;
};
