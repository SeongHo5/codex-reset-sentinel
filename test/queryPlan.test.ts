import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_QUERIES } from "../src/search/queryPlan.js";

await test("query plan is deterministic and scoped to x.com thsottiaux status URLs", () => {
  assert.equal(DEFAULT_QUERIES.length, 5);
  assert.deepEqual([...DEFAULT_QUERIES], [...new Set(DEFAULT_QUERIES)]);
  assert.ok(DEFAULT_QUERIES.every((query) => query.startsWith("site:x.com/thsottiaux/status")));
});
