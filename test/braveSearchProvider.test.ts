import test from "node:test";
import assert from "node:assert/strict";
import { BraveSearchProvider } from "../src/search/providers/BraveSearchProvider.js";

await test("BraveSearchProvider calls official Brave endpoint and parses web results", async () => {
  let calledUrl = "";
  let token = "";
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calledUrl = String(input);
    token = String((init?.headers as Record<string, string>)["X-Subscription-Token"]);
    return new Response(
      JSON.stringify({
        web: {
          results: [
            {
              title: "Tibo on X: Codex limits have been reset",
              url: "https://x.com/thsottiaux/status/2055446089957036402",
              description: "Codex limits have been reset.",
              extra_snippets: ["I have reset Codex rate limits for all paid plans."],
              age: "2026-05-16",
            },
          ],
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const provider = new BraveSearchProvider("secret", { count: 20, freshness: "pw", extraSnippets: true }, fetchImpl as typeof fetch);
  const response = await provider.search('site:x.com/thsottiaux/status Codex "usage limits" reset');

  assert.equal(token, "secret");
  assert.match(calledUrl, /^https:\/\/api\.search\.brave\.com\/res\/v1\/web\/search/);
  assert.match(calledUrl, /count=20/);
  assert.match(calledUrl, /freshness=pw/);
  assert.match(calledUrl, /result_filter=web/);
  assert.match(calledUrl, /operators=true/);
  assert.match(calledUrl, /spellcheck=false/);
  assert.match(calledUrl, /extra_snippets=true/);
  assert.equal(response.provider, "brave");
  assert.equal(response.results[0]?.snippet, "Codex limits have been reset. … I have reset Codex rate limits for all paid plans.");
});
