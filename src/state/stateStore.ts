import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { EventType } from "../domain/eventTypes.js";
import { isEventType } from "../domain/eventTypes.js";
import type { WatchSourceState, WatchState } from "./WatchState.js";
import { maxPostId } from "./postId.js";
import { DEFAULT_QUERIES, SEARCH_TARGET, SOURCE_KEY } from "../search/queryPlan.js";

export const STATE_SCHEMA_VERSION = 1;
export const MAX_OBSERVED_RESULTS = 500;
export const MAX_NOTIFIED_IDS = 1000;

export async function loadState(path: string): Promise<WatchState> {
  try {
    const raw = await readFile(path, "utf8");
    return normalizeState(JSON.parse(raw) as Partial<WatchState>);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyState();
    }
    throw error;
  }
}

export async function saveState(path: string, state: WatchState): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function createEmptyState(): WatchState {
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    updatedAt: null,
    sources: {},
  };
}

export function getOrCreateSourceState(state: WatchState, provider: string, now: string): WatchSourceState {
  state.sources[SOURCE_KEY] ??= {
    type: "official-search-api",
    target: SEARCH_TARGET,
    provider,
    queries: [...DEFAULT_QUERIES],
    lastCheckedAt: null,
    observedResults: {},
    notifiedIds: [],
    maxObservedId: null,
  };

  const source = state.sources[SOURCE_KEY];
  source.provider = provider;
  source.queries = [...DEFAULT_QUERIES];
  source.lastCheckedAt ??= now;
  return source;
}

export function shouldClassify(args: {
  source: WatchSourceState;
  id: string;
  evidenceHash: string;
  now: Date;
}): boolean {
  const observed = args.source.observedResults[args.id];
  if (!observed) return true;
  if (observed.evidenceHash !== args.evidenceHash) return true;
  if (observed.lastClassification === "RELATED_NO_ACTION" || observed.lastClassification === "UNRELATED") {
    return withinRetryWindow(observed.firstSeenAt, args.now);
  }
  return false;
}

export function recordObservedResult(args: {
  source: WatchSourceState;
  id: string;
  canonicalUrl: string;
  evidenceHash: string;
  classification: EventType;
  queryHits: string[];
  now: string;
}): void {
  const existing = args.source.observedResults[args.id];
  const queryHits = new Set(existing?.queryHits ?? []);
  for (const query of args.queryHits) queryHits.add(query);

  args.source.observedResults[args.id] = {
    canonicalUrl: args.canonicalUrl,
    firstSeenAt: existing?.firstSeenAt ?? args.now,
    lastSeenAt: args.now,
    evidenceHash: args.evidenceHash,
    lastClassification: args.classification,
    lastClassifiedAt: args.now,
    queryHits: [...queryHits].sort(),
  };

  args.source.maxObservedId = maxPostId(Object.keys(args.source.observedResults));
  pruneObservedResults(args.source);
}

export function recordNotification(source: WatchSourceState, id: string): void {
  if (!source.notifiedIds.includes(id)) {
    source.notifiedIds.push(id);
  }
  if (source.notifiedIds.length > MAX_NOTIFIED_IDS) {
    source.notifiedIds = source.notifiedIds.slice(-MAX_NOTIFIED_IDS);
  }
}

export function touchSource(state: WatchState, source: WatchSourceState, now: string): void {
  source.lastCheckedAt = now;
  state.updatedAt = now;
}

function normalizeState(input: Partial<WatchState>): WatchState {
  if (input.schemaVersion !== STATE_SCHEMA_VERSION || typeof input.sources !== "object" || input.sources === null) {
    return createEmptyState();
  }

  const sources: WatchState["sources"] = {};
  for (const [key, value] of Object.entries(input.sources)) {
    const normalized = normalizeSource(value as Partial<WatchSourceState>);
    if (normalized) {
      sources[key] = normalized;
    }
  }

  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : null,
    sources,
  };
}

function normalizeSource(input: Partial<WatchSourceState>): WatchSourceState | null {
  if (input.type !== "official-search-api") return null;

  const observedResults: WatchSourceState["observedResults"] = {};
  if (typeof input.observedResults === "object" && input.observedResults !== null) {
    for (const [id, observed] of Object.entries(input.observedResults)) {
      if (!/^\d+$/.test(id)) continue;
      const value = observed as Partial<WatchSourceState["observedResults"][string]>;
      if (
        typeof value.canonicalUrl !== "string" ||
        typeof value.firstSeenAt !== "string" ||
        typeof value.lastSeenAt !== "string" ||
        typeof value.evidenceHash !== "string" ||
        !isEventType(value.lastClassification) ||
        typeof value.lastClassifiedAt !== "string"
      ) {
        continue;
      }
      observedResults[id] = {
        canonicalUrl: value.canonicalUrl,
        firstSeenAt: value.firstSeenAt,
        lastSeenAt: value.lastSeenAt,
        evidenceHash: value.evidenceHash,
        lastClassification: value.lastClassification,
        lastClassifiedAt: value.lastClassifiedAt,
        queryHits: Array.isArray(value.queryHits) ? value.queryHits.filter((query): query is string => typeof query === "string") : [],
      };
    }
  }

  const notifiedIds = Array.isArray(input.notifiedIds)
    ? input.notifiedIds.filter((id): id is string => typeof id === "string" && /^\d+$/.test(id)).slice(-MAX_NOTIFIED_IDS)
    : [];

  return {
    type: "official-search-api",
    target: SEARCH_TARGET,
    provider: typeof input.provider === "string" ? input.provider : "unknown",
    queries: Array.isArray(input.queries) ? input.queries.filter((query): query is string => typeof query === "string") : [...DEFAULT_QUERIES],
    lastCheckedAt: typeof input.lastCheckedAt === "string" ? input.lastCheckedAt : null,
    observedResults,
    notifiedIds,
    maxObservedId: maxPostId(Object.keys(observedResults)),
  };
}

function withinRetryWindow(firstSeenAt: string, now: Date): boolean {
  const firstSeen = Date.parse(firstSeenAt);
  if (Number.isNaN(firstSeen)) return true;
  const hours = (now.getTime() - firstSeen) / 3_600_000;
  return hours <= 24;
}

function pruneObservedResults(source: WatchSourceState): void {
  const entries = Object.entries(source.observedResults);
  if (entries.length <= MAX_OBSERVED_RESULTS) return;

  entries.sort(([, a], [, b]) => Date.parse(a.lastSeenAt) - Date.parse(b.lastSeenAt));
  const toKeep = entries.slice(-MAX_OBSERVED_RESULTS);
  source.observedResults = Object.fromEntries(toKeep);
}
