import test from "node:test";
import assert from "node:assert/strict";
import { extractStatusUrl } from "../src/search/statusUrl.js";

await test("canonicalizes x.com status URL and removes query", () => {
  assert.deepEqual(extractStatusUrl("https://x.com/thsottiaux/status/2055446089957036402?ref=search"), {
    id: "2055446089957036402",
    canonicalUrl: "https://x.com/thsottiaux/status/2055446089957036402",
  });
});

await test("canonicalizes twitter.com alias", () => {
  assert.deepEqual(extractStatusUrl("https://twitter.com/thsottiaux/status/2055446089957036402"), {
    id: "2055446089957036402",
    canonicalUrl: "https://x.com/thsottiaux/status/2055446089957036402",
  });
});

await test("ignores non-target and non-status URLs", () => {
  assert.equal(extractStatusUrl("https://x.com/other/status/2055446089957036402"), null);
  assert.equal(extractStatusUrl("https://x.com/thsottiaux"), null);
  assert.equal(extractStatusUrl("https://example.com/thsottiaux/status/2055446089957036402"), null);
});
