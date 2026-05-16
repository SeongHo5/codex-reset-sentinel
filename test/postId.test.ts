import test from "node:test";
import assert from "node:assert/strict";
import { comparePostIds, maxPostId } from "../src/state/postId.js";

await test("compares IDs beyond JavaScript safe integer range", () => {
  assert.equal(comparePostIds("2055446089957036402", "2055446089957036401"), 1);
  assert.equal(comparePostIds("2055446089957036401", "2055446089957036402"), -1);
  assert.equal(maxPostId(["9007199254740993", "9007199254740992"]), "9007199254740993");
});
