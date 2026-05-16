import { createHash } from "node:crypto";
import type { SearchCandidate } from "../domain/searchCandidate.js";

export function evidenceHash(candidate: SearchCandidate): string {
  const normalized = JSON.stringify({
    title: normalize(candidate.title),
    snippet: normalize(candidate.snippet),
    canonicalUrl: candidate.canonicalUrl,
    queryHits: [...candidate.queryHits].sort(),
    provider: candidate.provider,
    providerDate: candidate.providerDate ?? "",
  });
  return `sha256:${createHash("sha256").update(normalized).digest("hex")}`;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}
