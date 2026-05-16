import { TARGET_USERNAME } from "./queryPlan.js";

export type StatusUrlCandidate = {
  id: string;
  canonicalUrl: string;
};

export function extractStatusUrl(rawUrl: string): StatusUrlCandidate | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "x.com" && host !== "twitter.com") {
    return null;
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 3) {
    return null;
  }

  const [username, statusPart, id] = parts;
  if (username?.toLowerCase() !== TARGET_USERNAME || statusPart !== "status" || !/^\d+$/.test(id ?? "")) {
    return null;
  }

  return {
    id,
    canonicalUrl: `https://x.com/${TARGET_USERNAME}/status/${id}`,
  };
}
