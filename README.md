# codex-limit-sentinel

`codex-limit-sentinel` is a personal GitHub Actions monitor for Codex / GPT-5.5 usage-limit reset announcements.

It does **not** call the X API, fetch `x.com` pages, scrape X, or scrape search-result HTML. The MVP discovers indexed `x.com/thsottiaux/status/<id>` URLs through an official Search API provider, classifies provider title/snippet evidence, sends Discord notifications for actionable reset or policy events, and commits watch state back to the repository.

## MVP behavior

- Runs every 10 minutes via GitHub Actions and supports manual `workflow_dispatch`.
- Uses Brave Search API as the default official Search API provider.
- Monitors only Tibo (`@thsottiaux`) status URLs.
- Sends Discord alerts for:
  - `RESET_PLANNED`
  - `RESET_DONE`
  - `RESET_DELAYED`
  - `RESET_CANCELLED`
  - `LIMIT_POLICY_CHANGED`
- Suppresses `RELATED_NO_ACTION`, unrelated snippets, and already-notified status IDs.
- Stores canonical state in `.state/codex-limit-watch.json`.
- Lets the workflow commit state; the Node app never runs `git commit` or `git push`.

## Required GitHub secrets

| Secret | Purpose |
| --- | --- |
| `BRAVE_SEARCH_API_KEY` | API key for Brave Search API. |
| `DISCORD_WEBHOOK_URL` | Discord webhook for actionable notifications. |

The workflow also requires:

```yaml
permissions:
  contents: write
```

so it can commit `.state/codex-limit-watch.json` after polling.

## Local usage

Install dependencies:

```bash
npm install
```

Run verification:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Run with mocked no-network search fixture:

```bash
STATE_PATH=/tmp/codex-limit-watch.json MOCK_SEARCH_FIXTURE=test/fixtures/search-results.json DRY_RUN=1 npm run watch
```

Run against the real Search API without sending Discord notifications:

```bash
BRAVE_SEARCH_API_KEY=... DRY_RUN=1 npm run watch
```

Run live:

```bash
BRAVE_SEARCH_API_KEY=... DISCORD_WEBHOOK_URL=... npm run watch
```

`DRY_RUN=1` suppresses Discord delivery. It does not automatically mock Search API calls; use `MOCK_SEARCH_FIXTURE=...` for fully offline runs.

## Search provider constraints

The source boundary is intentionally narrow:

- no X API in MVP;
- no direct `x.com` page fetch;
- no X scraping, browser automation, RSS, Nitter, or unofficial mirrors;
- no search-result HTML scraping;
- official Search API provider responses only.

The default provider is Brave Search API. Brave documents a web search endpoint using an API key header and describes Brave Search as powered by its own independent index. Brave also documents API pricing/plans and storage-rights considerations; this project stores only minimal evidence metadata rather than raw API payloads.

Provider notes to re-check before changing defaults:

- Brave Search API: <https://brave.com/search/api/> and <https://api-dashboard.search.brave.com/api-reference/web/search/post>
- Google Custom Search JSON API: <https://developers.google.com/custom-search/v1/overview> — not the MVP default because Google documents new-customer closure and a transition deadline for existing customers.
- Microsoft Bing Search APIs: <https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement> — legacy Bing Search APIs retired on August 11, 2025, so they are not implementation targets.

## Freshness and correctness limits

This is a best-effort search-alert bot, not a guaranteed real-time X timeline watcher. Search indexing may lag or omit posts, and snippets may be too thin to classify. The classifier is conservative: it sends alerts only when title/snippet/query evidence contains an actionable reset or policy-change signal.

If Discord succeeds but the workflow fails before committing state, a duplicate notification may occur on the next run. The MVP explicitly accepts this at-least-once delivery behavior.

## State model

`.state/codex-limit-watch.json` stores per-source state:

- `observedResults`: canonical status URL, evidence hash, last classification, first/last seen time, query hits.
- `notifiedIds`: status IDs with successful actionable notifications.
- `maxObservedId`: diagnostic only; search results are not a reliable chronological cursor.

A previously non-actionable or thin result is reclassified when provider evidence changes, when its prior classification was non-actionable, or while the short retry window remains open.

## Implementation plan

The approved OMX plan is stored at:

```text
.omx/plans/ralplan-codex-limit-sentinel.md
```
