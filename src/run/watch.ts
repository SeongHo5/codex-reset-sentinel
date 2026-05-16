import type { Config } from "../config.js";
import { isActionableEventType } from "../domain/eventTypes.js";
import type { SearchCandidate } from "../domain/searchCandidate.js";
import { classifySearchResult } from "../classify/classifySearchResult.js";
import type { Notifier } from "../notify/Notifier.js";
import type { SearchProvider } from "../search/SearchProvider.js";
import { evidenceHash } from "../search/evidenceHash.js";
import { DEFAULT_QUERIES } from "../search/queryPlan.js";
import { extractStatusUrl } from "../search/statusUrl.js";
import {
  getOrCreateSourceState,
  loadState,
  recordNotification,
  recordObservedResult,
  saveState,
  shouldClassify,
  touchSource,
} from "../state/stateStore.js";
import { comparePostIds } from "../state/postId.js";

export type WatchSummary = {
  checkedAt: string;
  provider: string;
  queriesRun: number;
  rawResults: number;
  candidates: number;
  classified: number;
  notificationsSent: number;
  suppressed: number;
  statePath: string;
};

export async function runWatch(args: {
  config: Config;
  searchProvider: SearchProvider;
  notifier: Notifier;
  now?: Date;
}): Promise<WatchSummary> {
  const now = args.now ?? new Date();
  const nowIso = now.toISOString();
  const state = await loadState(args.config.statePath);
  const source = getOrCreateSourceState(state, args.searchProvider.name, nowIso);

  const byId = new Map<string, SearchCandidate>();
  let rawResults = 0;

  for (const query of DEFAULT_QUERIES) {
    const response = await args.searchProvider.search(query);
    rawResults += response.results.length;

    for (const result of response.results) {
      const status = extractStatusUrl(result.url);
      if (!status) continue;

      const previous = byId.get(status.id);
      const candidate: SearchCandidate = {
        id: status.id,
        canonicalUrl: status.canonicalUrl,
        title: result.title,
        snippet: result.snippet ?? "",
        query,
        queryHits: [query],
        provider: response.provider,
        providerDate: result.providerDate,
      };

      if (previous) {
        byId.set(status.id, {
          ...candidate,
          title: chooseLonger(previous.title, candidate.title),
          snippet: chooseLonger(previous.snippet, candidate.snippet),
          query: previous.query,
          queryHits: [...new Set([...previous.queryHits, ...candidate.queryHits])].sort(),
        });
      } else {
        byId.set(status.id, candidate);
      }
    }
  }

  const candidates = [...byId.values()].sort((a, b) => comparePostIds(b.id, a.id));
  let classified = 0;
  let notificationsSent = 0;
  let suppressed = 0;

  for (const candidate of candidates) {
    const hash = evidenceHash(candidate);
    if (!shouldClassify({ source, id: candidate.id, evidenceHash: hash, now })) {
      suppressed += 1;
      continue;
    }

    const result = classifySearchResult(candidate);
    classified += 1;

    if (isActionableEventType(result.eventType) && !source.notifiedIds.includes(result.id)) {
      await args.notifier.notify({ candidate: result, checkedAt: nowIso });
      recordNotification(source, result.id);
      notificationsSent += 1;
    } else {
      suppressed += 1;
    }

    recordObservedResult({
      source,
      id: result.id,
      canonicalUrl: result.canonicalUrl,
      evidenceHash: hash,
      classification: result.eventType,
      queryHits: result.queryHits,
      now: nowIso,
    });
  }

  touchSource(state, source, nowIso);
  await saveState(args.config.statePath, state);

  return {
    checkedAt: nowIso,
    provider: args.searchProvider.name,
    queriesRun: DEFAULT_QUERIES.length,
    rawResults,
    candidates: candidates.length,
    classified,
    notificationsSent,
    suppressed,
    statePath: args.config.statePath,
  };
}

function chooseLonger(left: string, right: string): string {
  return right.length > left.length ? right : left;
}
