import { readFile } from "node:fs/promises";
import type { SearchProvider } from "../SearchProvider.js";
import type { SearchResponse, SearchResult } from "../SearchResult.js";

type FixtureFile = {
  provider?: string;
  responses?: Array<{
    query: string;
    results: SearchResult[];
  }>;
  results?: SearchResult[];
};

export class FixtureSearchProvider implements SearchProvider {
  readonly name = "fixture";
  private loaded?: Promise<FixtureFile>;

  constructor(private readonly fixturePath: string) {}

  async search(query: string): Promise<SearchResponse> {
    const fixture = await this.load();
    const matching = fixture.responses?.find((entry) => entry.query === query);
    const results = matching?.results ?? fixture.results ?? [];
    return {
      query,
      provider: fixture.provider ?? this.name,
      results,
    };
  }

  private async load(): Promise<FixtureFile> {
    this.loaded ??= readFile(this.fixturePath, "utf8").then((content) => JSON.parse(content) as FixtureFile);
    return this.loaded;
  }
}
