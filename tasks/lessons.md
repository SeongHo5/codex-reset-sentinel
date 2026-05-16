# Lessons

- When a Search API-backed monitor has a measured monthly quota cost per run, size the default cron from the measured cost, not only from raw query-count estimates; preserve safety margin for manual runs and provider variance.
- Do not add `Co-authored-by: OmX <omx@oh-my-codex.dev>` to commit messages unless the user explicitly requests it or a verified local hook rejects commits without it.
- For X-status search monitoring, prefer phrase-led queries learned from real positive examples over broad topic queries; keep query count fixed and use freshness windows to improve recall without increasing request count.
