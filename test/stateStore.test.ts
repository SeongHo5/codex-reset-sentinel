import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyState, getOrCreateSourceState, recordObservedResult, shouldClassify } from "../src/state/stateStore.js";

await test("creates search source state with observedResults", () => {
  const state = createEmptyState();
  const source = getOrCreateSourceState(state, "fixture", "2026-05-16T12:00:00.000Z");
  assert.equal(source.type, "official-search-api");
  assert.deepEqual(source.observedResults, {});
  assert.deepEqual(source.notifiedIds, []);
});

await test("reclassifies when evidence hash changes", () => {
  const state = createEmptyState();
  const source = getOrCreateSourceState(state, "fixture", "2026-05-16T12:00:00.000Z");
  recordObservedResult({
    source,
    id: "10",
    canonicalUrl: "https://x.com/thsottiaux/status/10",
    evidenceHash: "sha256:old",
    classification: "RELATED_NO_ACTION",
    queryHits: ["q1"],
    now: "2026-05-16T12:00:00.000Z",
  });

  assert.equal(shouldClassify({ source, id: "10", evidenceHash: "sha256:new", now: new Date("2026-05-16T13:00:00.000Z") }), true);
});

await test("does not reclassify unchanged actionable result", () => {
  const state = createEmptyState();
  const source = getOrCreateSourceState(state, "fixture", "2026-05-16T12:00:00.000Z");
  recordObservedResult({
    source,
    id: "10",
    canonicalUrl: "https://x.com/thsottiaux/status/10",
    evidenceHash: "sha256:same",
    classification: "RESET_PLANNED",
    queryHits: ["q1"],
    now: "2026-05-16T12:00:00.000Z",
  });

  assert.equal(shouldClassify({ source, id: "10", evidenceHash: "sha256:same", now: new Date("2026-05-16T13:00:00.000Z") }), false);
});

await test("normalizes partial source state by rebuilding required fields", async () => {
  const { loadState } = await import("../src/state/stateStore.js");
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "codex-state-normalize-"));
  try {
    const path = join(dir, "state.json");
    await writeFile(path, JSON.stringify({
      schemaVersion: 1,
      updatedAt: 123,
      sources: {
        "search:x-thsottiaux": {
          type: "official-search-api",
          provider: "fixture",
          observedResults: {
            "20": {
              canonicalUrl: "https://x.com/thsottiaux/status/20",
              firstSeenAt: "2026-05-16T12:00:00.000Z",
              lastSeenAt: "2026-05-16T12:00:00.000Z",
              evidenceHash: "sha256:x",
              lastClassification: "RELATED_NO_ACTION",
              lastClassifiedAt: "2026-05-16T12:00:00.000Z",
              queryHits: ["q1"],
            },
          },
          notifiedIds: ["20", "bad"],
        },
      },
    }));
    const state = await loadState(path);
    const source = state.sources["search:x-thsottiaux"]!;
    assert.equal(source.target, "x.com/thsottiaux/status");
    assert.equal(source.lastCheckedAt, null);
    assert.deepEqual(source.notifiedIds, ["20"]);
    assert.equal(source.maxObservedId, "20");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

await test("thin non-actionable snippets retry inside retry window but stop later", () => {
  const state = createEmptyState();
  const source = getOrCreateSourceState(state, "fixture", "2026-05-16T12:00:00.000Z");
  recordObservedResult({
    source,
    id: "30",
    canonicalUrl: "https://x.com/thsottiaux/status/30",
    evidenceHash: "sha256:same",
    classification: "RELATED_NO_ACTION",
    queryHits: ["q1"],
    now: "2026-05-16T12:00:00.000Z",
  });
  assert.equal(shouldClassify({ source, id: "30", evidenceHash: "sha256:same", now: new Date("2026-05-16T13:00:00.000Z") }), true);
  assert.equal(shouldClassify({ source, id: "30", evidenceHash: "sha256:same", now: new Date("2026-05-18T13:00:00.000Z") }), false);
});

await test("drops observed entries with invalid persisted classification", async () => {
  const { loadState } = await import("../src/state/stateStore.js");
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "codex-state-invalid-classification-"));
  try {
    const path = join(dir, "state.json");
    await writeFile(path, JSON.stringify({
      schemaVersion: 1,
      sources: {
        "search:x-thsottiaux": {
          type: "official-search-api",
          provider: "fixture",
          observedResults: {
            "40": {
              canonicalUrl: "https://x.com/thsottiaux/status/40",
              firstSeenAt: "2026-05-16T12:00:00.000Z",
              lastSeenAt: "2026-05-16T12:00:00.000Z",
              evidenceHash: "sha256:x",
              lastClassification: "BOGUS",
              lastClassifiedAt: "2026-05-16T12:00:00.000Z",
              queryHits: ["q1"],
            },
          },
          notifiedIds: [],
        },
      },
    }));
    const state = await loadState(path);
    assert.deepEqual(state.sources["search:x-thsottiaux"]!.observedResults, {});
    assert.equal(state.sources["search:x-thsottiaux"]!.maxObservedId, null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

await test("prunes observedResults to the newest bounded set", () => {
  const state = createEmptyState();
  const source = getOrCreateSourceState(state, "fixture", "2026-05-16T00:00:00.000Z");
  for (let i = 1; i <= 505; i += 1) {
    recordObservedResult({
      source,
      id: String(i),
      canonicalUrl: `https://x.com/thsottiaux/status/${i}`,
      evidenceHash: `sha256:${i}`,
      classification: "RELATED_NO_ACTION",
      queryHits: ["q1"],
      now: new Date(Date.UTC(2026, 4, 16, 0, 0, i)).toISOString(),
    });
  }

  assert.equal(Object.keys(source.observedResults).length, 500);
  assert.equal(source.observedResults["1"], undefined);
  assert.equal(source.observedResults["5"], undefined);
  assert.ok(source.observedResults["6"]);
  assert.ok(source.observedResults["505"]);
  assert.equal(source.maxObservedId, "505");
});
