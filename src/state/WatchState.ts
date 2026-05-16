import type { EventType } from "../domain/eventTypes.js";

export type ObservedResult = {
  canonicalUrl: string;
  firstSeenAt: string;
  lastSeenAt: string;
  evidenceHash: string;
  lastClassification: EventType;
  lastClassifiedAt: string;
  queryHits: string[];
};

export type WatchSourceState = {
  type: "official-search-api";
  target: "x.com/thsottiaux/status";
  provider: string;
  queries: string[];
  lastCheckedAt: string | null;
  observedResults: Record<string, ObservedResult>;
  notifiedIds: string[];
  maxObservedId: string | null;
};

export type WatchState = {
  schemaVersion: 1;
  updatedAt: string | null;
  sources: Record<string, WatchSourceState>;
};
