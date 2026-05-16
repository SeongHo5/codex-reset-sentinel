import test from "node:test";
import assert from "node:assert/strict";
import { classifySearchResult } from "../src/classify/classifySearchResult.js";
import type { SearchCandidate } from "../src/domain/searchCandidate.js";

function candidate(text: string): SearchCandidate {
  return {
    id: "2055446089957036402",
    canonicalUrl: "https://x.com/thsottiaux/status/2055446089957036402",
    title: text,
    snippet: text,
    query: 'site:x.com/thsottiaux/status Codex "usage limits" reset',
    queryHits: ['site:x.com/thsottiaux/status Codex "usage limits" reset'],
    provider: "fixture",
  };
}

await test("classifies reset planned", () => {
  assert.equal(classifySearchResult(candidate("I will reset usage limits this evening for Codex")).eventType, "RESET_PLANNED");
});

await test("classifies reset done", () => {
  assert.equal(classifySearchResult(candidate("Codex limits have been reset")).eventType, "RESET_DONE");
});

await test("classifies reset delayed", () => {
  assert.equal(classifySearchResult(candidate("Codex reset will happen later, delayed for now")).eventType, "RESET_DELAYED");
});

await test("classifies reset cancelled", () => {
  assert.equal(classifySearchResult(candidate("We won't reset Codex usage limits today")).eventType, "RESET_CANCELLED");
});

await test("classifies policy change", () => {
  assert.equal(classifySearchResult(candidate("Codex weekly limits are being adjusted")).eventType, "LIMIT_POLICY_CHANGED");
});


await test("classifies known Tibo reset announcement phrases", () => {
  const samples = [
    ["Happy Tuesday. Codex has hit 4M active users. To celebrate we will reset the rate limits again in a few hours. Enjoy!", "RESET_PLANNED"],
    ["Codex incident is mitigated. Apologies for the disruption and rate limit reset incoming.", "RESET_PLANNED"],
    ["Hi! To celebrate its 1-year anniversary, I have allowed Codex to reset its own rate limits across all plans. Enjoy all the new features.", "RESET_DONE"],
    ["I have reset Codex rate limits for ALL paid plans to celebrate a good week and allow everyone to build more with GPT-5.5. Enjoy", "RESET_DONE"],
    ["We are monitoring over the coming hours to fully confirm and I will reset usage limits this evening.", "RESET_PLANNED"],
  ] as const;

  for (const [text, expected] of samples) {
    assert.equal(classifySearchResult(candidate(text)).eventType, expected, text);
  }
});

await test("does not alert on non-actionable reset-cost commentary", () => {
  assert.equal(classifySearchResult(candidate("Don't just reset Codex rate limits for fun, it costs money.")).eventType, "RELATED_NO_ACTION");
});

await test("suppresses related no-action snippet", () => {
  assert.equal(classifySearchResult(candidate("We are investigating Codex degradation")).eventType, "RELATED_NO_ACTION");
});
