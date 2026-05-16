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

await test("suppresses related no-action snippet", () => {
  assert.equal(classifySearchResult(candidate("We are investigating Codex degradation")).eventType, "RELATED_NO_ACTION");
});
