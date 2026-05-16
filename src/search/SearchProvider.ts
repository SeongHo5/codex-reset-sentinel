import type { SearchResponse } from "./SearchResult.js";

export interface SearchProvider {
  readonly name: string;
  search(query: string): Promise<SearchResponse>;
}
