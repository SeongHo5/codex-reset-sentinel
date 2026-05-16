export type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
  providerDate?: string;
  providerResultId?: string;
};

export type SearchResponse = {
  query: string;
  provider: string;
  results: SearchResult[];
};
