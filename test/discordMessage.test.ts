import test from "node:test";
import assert from "node:assert/strict";
import { formatDiscordMessage } from "../src/notify/DiscordNotifier.js";
import type { ClassifiedCandidate } from "../src/domain/searchCandidate.js";

const candidate: ClassifiedCandidate = {
  id: "2055446089957036402",
  canonicalUrl: "https://x.com/thsottiaux/status/2055446089957036402",
  title: "I will reset usage limits this evening",
  snippet: "I will reset usage limits this evening for GPT-5.5 in Codex.",
  query: 'site:x.com/thsottiaux/status "I will reset usage limits this evening"',
  queryHits: ['site:x.com/thsottiaux/status "I will reset usage limits this evening"'],
  provider: "brave",
  eventType: "RESET_PLANNED",
  confidence: "HIGH",
  matchedSignals: [],
};

await test("formats Korean Discord notification by default", () => {
  const message = formatDiscordMessage({ candidate, checkedAt: "2026-05-16T00:31:00.000Z" }, "ko");
  assert.match(message, /Codex 제한 업데이트 감지/);
  assert.match(message, /유형: RESET_PLANNED \(사용량 제한 리셋 예정\)/);
  assert.match(message, /신뢰도: 높음/);
  assert.match(message, /감지 경로: brave 검색 결과 스니펫/);
  assert.match(message, /원문:/);
});

await test("formats English Discord notification when requested", () => {
  const message = formatDiscordMessage({ candidate, checkedAt: "2026-05-16T00:31:00.000Z" }, "en");
  assert.match(message, /Codex Limit Update Detected/);
  assert.match(message, /Type: RESET_PLANNED \(Usage limit reset planned\)/);
  assert.match(message, /Confidence: HIGH/);
});
