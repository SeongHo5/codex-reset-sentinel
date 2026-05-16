import type { SearchProvider } from "../SearchProvider.js";
import type { SearchResponse, SearchResult } from "../SearchResult.js";

const BRAVE_WEB_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";

type BraveWebResult = {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  page_age?: string;
};

type BraveWebResponse = {
  web?: {
    results?: BraveWebResult[];
  };
};

export class BraveSearchProvider implements SearchProvider {
  readonly name = "brave";

  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch) {
    if (!apiKey) {
      throw new Error("BRAVE_SEARCH_API_KEY is required when using the Brave search provider.");
    }
  }

  async search(query: string): Promise<SearchResponse> {
    const url = new URL(BRAVE_WEB_SEARCH_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("count", "10");
    url.searchParams.set("search_lang", "en");
    url.searchParams.set("safesearch", "off");

    const response = await this.fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": this.apiKey,
      },
    });

    if (!response.ok) {
      const body = await safeBody(response);
      throw new Error(`Brave Search API failed: ${response.status} ${response.statusText}${body ? ` - ${body}` : ""}`);
    }

    const payload = (await response.json()) as BraveWebResponse;
    const results: SearchResult[] = (payload.web?.results ?? [])
      .filter((result) => result.url && result.title)
      .map((result) => ({
        title: result.title ?? "",
        url: result.url ?? "",
        snippet: result.description ?? "",
        providerDate: result.age ?? result.page_age,
      }));

    return {
      query,
      provider: this.name,
      results,
    };
  }
}

async function safeBody(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "";
  }
}
