import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_QUERIES } from "../src/search/queryPlan.js";

await test("query plan is deterministic and scoped to x.com thsottiaux status URLs", () => {
  assert.equal(DEFAULT_QUERIES.length, 5);
  assert.deepEqual([...DEFAULT_QUERIES], [...new Set(DEFAULT_QUERIES)]);
  assert.ok(DEFAULT_QUERIES.every((query) => query.startsWith("site:x.com/thsottiaux/status")));
});

await test("query plan covers known reset announcement phrase patterns", () => {
  const joined = DEFAULT_QUERIES.join("\n");
  assert.match(joined, /reset usage limits/);
  assert.match(joined, /reset the rate limits/);
  assert.match(joined, /rate limit reset incoming/);
  assert.match(joined, /reset its own rate limits/);
  assert.match(joined, /reset Codex rate limits/);
  assert.match(joined, /usage limits reset/);
  assert.match(joined, /rate limits reset/);
  assert.match(joined, /have reset Codex rate limits/);
  assert.match(joined, /OR/);
});
