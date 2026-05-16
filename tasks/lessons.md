# Lessons

- When a Search API-backed monitor has a measured monthly quota cost per run, size the default cron from the measured cost, not only from raw query-count estimates; preserve safety margin for manual runs and provider variance.
- Do not add `Co-authored-by: OmX <omx@oh-my-codex.dev>` to commit messages unless the user explicitly requests it or a verified local hook rejects commits without it.
- For X-status search monitoring, prefer phrase-led queries learned from real positive examples over broad topic queries; keep query count fixed and use freshness windows to improve recall without increasing request count.
- When users provide real positive alert examples, update classifier action patterns as well as search queries; search recall and classification recall are separate failure modes.
- For reset alerts, distinguish passive reset-cost commentary from completed reset statements such as `I have reset Codex rate limits`; add negative tests for tempting false-positive fragments.
- Brave Search request volume is driven by API calls, not by OR variants inside a query or count/extra snippet parameters; use same-query variants cautiously to raise recall without increasing scheduled request count.
- A freshness window can silently exclude historical false negatives; for search monitors, provide a manual backfill freshness override and choose a default window that matches the desired recovery horizon.
- For search-backed monitors, log per-query raw result URLs/titles in CI before candidate filtering so discovery misses can be separated from parser/classifier/state suppressions.
