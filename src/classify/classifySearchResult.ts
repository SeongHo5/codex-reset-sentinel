import type { ClassifiedCandidate, SearchCandidate } from "../domain/searchCandidate.js";
import type { EventType } from "../domain/eventTypes.js";
import { ACTION_PATTERNS, RELEVANCE_PATTERNS } from "./rules.js";

const EVENT_PRIORITY: Exclude<EventType, "RELATED_NO_ACTION" | "UNRELATED">[] = [
  "RESET_CANCELLED",
  "RESET_DELAYED",
  "RESET_DONE",
  "RESET_PLANNED",
  "LIMIT_POLICY_CHANGED",
];

export function classifySearchResult(candidate: SearchCandidate): ClassifiedCandidate {
  const relevanceHaystack = [candidate.title, candidate.snippet, candidate.query].join("\n");
  const actionHaystack = [candidate.title, candidate.snippet].join("\n");
  const relevanceMatches = RELEVANCE_PATTERNS.filter((pattern) => pattern.test(relevanceHaystack)).map(String);

  if (relevanceMatches.length === 0) {
    return withClassification(candidate, "UNRELATED", "LOW", []);
  }

  for (const eventType of EVENT_PRIORITY) {
    const matched = ACTION_PATTERNS[eventType].filter((pattern) => pattern.test(actionHaystack)).map(String);
    if (matched.length > 0) {
      const confidence = matched.length > 0 && relevanceMatches.length > 1 ? "HIGH" : "MEDIUM";
      return withClassification(candidate, eventType, confidence, [...relevanceMatches, ...matched]);
    }
  }

  return withClassification(candidate, "RELATED_NO_ACTION", "LOW", relevanceMatches);
}

function withClassification(
  candidate: SearchCandidate,
  eventType: EventType,
  confidence: ClassifiedCandidate["confidence"],
  matchedSignals: string[],
): ClassifiedCandidate {
  return {
    ...candidate,
    eventType,
    confidence,
    matchedSignals,
  };
}
