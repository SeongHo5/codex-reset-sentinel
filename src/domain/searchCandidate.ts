import type { EventType } from "./eventTypes.js";

export type SearchCandidate = {
  id: string;
  canonicalUrl: string;
  title: string;
  snippet: string;
  query: string;
  queryHits: string[];
  provider: string;
  providerDate?: string;
};

export type ClassifiedCandidate = SearchCandidate & {
  eventType: EventType;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  matchedSignals: string[];
};
