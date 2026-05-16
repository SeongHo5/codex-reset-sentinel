import type { SearchProvider } from "../SearchProvider.js";
import type { SearchResponse, SearchResult } from "../SearchResult.js";

const BRAVE_WEB_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";

type BraveWebResult = {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  page_age?: string;
  extra_snippets?: string[];
};

type BraveWebResponse = {
  web?: {
    results?: BraveWebResult[];
  };
};

export type BraveSearchOptions = {
  count: number;
  freshness?: string;
  extraSnippets: boolean;
};

export class BraveSearchProvider implements SearchProvider {
  readonly name = "brave";

  constructor(
    private readonly apiKey: string,
    private readonly options: BraveSearchOptions,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    if (!apiKey) {
      throw new Error("BRAVE_SEARCH_API_KEY is required when using the Brave search provider.");
    }
  }

  async search(query: string): Promise<SearchResponse> {
    const url = new URL(BRAVE_WEB_SEARCH_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(this.options.count));
    url.searchParams.set("search_lang", "en");
    url.searchParams.set("safesearch", "off");
    url.searchParams.set("result_filter", "web");
    url.searchParams.set("operators", "true");
    url.searchParams.set("spellcheck", "false");
    if (this.options.extraSnippets) {
      url.searchParams.set("extra_snippets", "true");
    }
    if (this.options.freshness) {
      url.searchParams.set("freshness", this.options.freshness);
    }

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
        snippet: mergeSnippets(result.description, result.extra_snippets),
        providerDate: result.age ?? result.page_age,
      }));

    return {
      query,
      provider: this.name,
      results,
    };
  }
}

function mergeSnippets(description: string | undefined, extraSnippets: string[] | undefined): string {
  return [...new Set([description, ...(extraSnippets ?? [])].filter((snippet): snippet is string => Boolean(snippet?.trim())))]
    .join(" … ");
}

async function safeBody(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "";
  }
}
