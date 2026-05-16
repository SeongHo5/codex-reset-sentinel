import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Notification, Notifier } from "../src/notify/Notifier.js";
import { FixtureSearchProvider } from "../src/search/providers/FixtureSearchProvider.js";
import { runWatch } from "../src/run/watch.js";

class RecordingNotifier implements Notifier {
  readonly sent: Notification[] = [];
  async notify(notification: Notification): Promise<void> {
    this.sent.push(notification);
  }
}

await test("watch sends one actionable notification and dedupes second run", async () => {
  const dir = await mkdtemp(join(tmpdir(), "codex-limit-sentinel-"));
  try {
    const statePath = join(dir, "state.json");
    const config = {
      searchProvider: "fixture" as const,
      statePath,
      dryRun: true,
      mockSearchFixture: "test/fixtures/search-results.json",
      searchCount: 20,
      alertLocale: "ko" as const,
    };
    const provider = new FixtureSearchProvider("test/fixtures/search-results.json");
    const notifier = new RecordingNotifier();

    const first = await runWatch({ config, searchProvider: provider, notifier, now: new Date("2026-05-16T12:00:00.000Z") });
    assert.equal(first.notificationsSent, 1);
    assert.equal(notifier.sent[0]?.candidate.eventType, "RESET_PLANNED");

    const second = await runWatch({ config, searchProvider: provider, notifier, now: new Date("2026-05-16T12:10:00.000Z") });
    assert.equal(second.notificationsSent, 0);
    assert.equal(notifier.sent.length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

class FailingNotifier implements Notifier {
  async notify(): Promise<void> {
    throw new Error("discord down");
  }
}

await test("notifier failure rejects and does not persist notified ID", async () => {
  const dir = await mkdtemp(join(tmpdir(), "codex-limit-sentinel-fail-"));
  try {
    const statePath = join(dir, "state.json");
    const config = {
      searchProvider: "fixture" as const,
      statePath,
      dryRun: true,
      mockSearchFixture: "test/fixtures/search-results.json",
      searchCount: 20,
      alertLocale: "ko" as const,
    };
    const provider = new FixtureSearchProvider("test/fixtures/search-results.json");
    await assert.rejects(
      runWatch({ config, searchProvider: provider, notifier: new FailingNotifier(), now: new Date("2026-05-16T12:00:00.000Z") }),
      /discord down/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

await test("query hits remain structured across duplicate query matches", async () => {
  const dir = await mkdtemp(join(tmpdir(), "codex-limit-sentinel-queryhits-"));
  try {
    const fixturePath = join(dir, "fixture.json");
    const statePath = join(dir, "state.json");
    const queryA = 'site:x.com/thsottiaux/status "reset usage limits"';
    const queryB = 'site:x.com/thsottiaux/status Codex reset limits';
    await import("node:fs/promises").then(({ writeFile }) => writeFile(fixturePath, JSON.stringify({
      provider: "fixture",
      responses: [
        { query: queryA, results: [{ title: "Tibo: I will reset usage limits", url: "https://x.com/thsottiaux/status/42", snippet: "I will reset usage limits for Codex." }] },
        { query: queryB, results: [{ title: "Tibo: I will reset usage limits", url: "https://x.com/thsottiaux/status/42", snippet: "I will reset usage limits for GPT-5.5 Codex." }] },
      ],
    })));
    const provider = new FixtureSearchProvider(fixturePath);
    const notifier = new RecordingNotifier();
    await runWatch({
      config: { searchProvider: "fixture", statePath, dryRun: true, mockSearchFixture: fixturePath, searchCount: 20, alertLocale: "ko" as const },
      searchProvider: provider,
      notifier,
      now: new Date("2026-05-16T12:00:00.000Z"),
    });
    const state = JSON.parse(await import("node:fs/promises").then(({ readFile }) => readFile(statePath, "utf8")));
    assert.deepEqual(new Set(state.sources["search:x-thsottiaux"].observedResults["42"].queryHits), new Set([queryA, queryB]));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

await test("newer actionable candidates notify before older candidates", async () => {
  const dir = await mkdtemp(join(tmpdir(), "codex-limit-sentinel-order-"));
  try {
    const fixturePath = join(dir, "fixture.json");
    const statePath = join(dir, "state.json");
    const query = 'site:x.com/thsottiaux/status "reset usage limits"';
    await import("node:fs/promises").then(({ writeFile }) => writeFile(fixturePath, JSON.stringify({
      provider: "fixture",
      responses: [
        { query, results: [
          { title: "Older: I will reset usage limits", url: "https://x.com/thsottiaux/status/41", snippet: "I will reset usage limits for Codex." },
          { title: "Newer: I will reset usage limits", url: "https://x.com/thsottiaux/status/42", snippet: "I will reset usage limits for Codex." },
        ] },
      ],
    })));
    const provider = new FixtureSearchProvider(fixturePath);
    const notifier = new RecordingNotifier();
    await runWatch({
      config: { searchProvider: "fixture", statePath, dryRun: true, mockSearchFixture: fixturePath, searchCount: 20, alertLocale: "ko" as const },
      searchProvider: provider,
      notifier,
      now: new Date("2026-05-16T12:00:00.000Z"),
    });
    assert.deepEqual(notifier.sent.map((notification) => notification.candidate.id), ["42", "41"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
