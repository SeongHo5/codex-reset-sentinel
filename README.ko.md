# codex-limit-sentinel

`codex-limit-sentinel`는 Codex / GPT-5.5 usage limit reset 공지를 감지하기 위한 개인용 GitHub Actions 모니터입니다.

이 프로젝트는 **X API를 호출하지 않고**, `x.com` 페이지를 직접 fetch하지 않으며, X나 검색 결과 HTML을 스크래핑하지 않습니다. MVP는 공식 Search API provider를 통해 색인된 `x.com/thsottiaux/status/<id>` URL을 발견하고, provider가 제공한 title/snippet 근거만 rule 기반으로 분류한 뒤, actionable reset 또는 policy 이벤트를 Discord로 알리고 watch state를 repository에 커밋합니다.

## MVP 동작

- GitHub Actions에서 기본 6시간마다 실행되며 수동 `workflow_dispatch`도 지원합니다. 실제 테스트 1회가 Brave 월 quota의 약 0.6%를 사용했기 때문에, 10분 주기는 월 quota를 빠르게 소진하고 4시간 주기도 여유가 작을 수 있습니다.
- 기본 공식 Search API provider는 Brave Search API입니다.
- 감시 대상은 Tibo (`@thsottiaux`) status URL만입니다.
- Discord 알림 대상 이벤트:
  - `RESET_PLANNED`
  - `RESET_DONE`
  - `RESET_DELAYED`
  - `RESET_CANCELLED`
  - `LIMIT_POLICY_CHANGED`
- `RELATED_NO_ACTION`, 무관한 snippet, 이미 알림한 status ID는 suppress합니다.
- canonical state는 `.state/codex-limit-watch.json`에 저장합니다.
- state commit은 GitHub Actions workflow가 담당합니다. Node 앱은 `git commit`이나 `git push`를 실행하지 않습니다.

## 스케줄과 quota

기본 workflow schedule:

```yaml
- cron: '0 */6 * * *'
```

기본 5-query plan 기준으로 30일 동안 약 600 Search API requests를 사용합니다. 실제 workflow 1회가 Brave 월 quota의 약 0.6%를 사용한다면, 6시간 polling은 30일 기준 수동 실행 전 약 72%를 사용합니다. Brave plan/quota가 다르면 workflow를 활성화하기 전에 cron 간격이나 query plan을 조정하세요. 긴급 확인은 `workflow_dispatch`를 사용합니다.

수동 backfill: 오래된 색인 post를 다시 확인하려면 `workflow_dispatch`에서 `search_freshness=pm` 또는 `py`를 지정합니다. query 수는 그대로라 request 수는 늘지 않지만, 이전에 non-actionable로 분류됐거나 반환되지 않았던 과거 actionable post가 다시 드러날 수 있습니다.

기본 query plan은 topic-led보다 phrase-led에 가깝습니다. 이전 @thsottiaux reset 공지에서 관찰한 표현을 대상으로 합니다.

- `Codex "usage limits" reset`
- `Codex "rate limits" reset`
- `"reset Codex rate limits"`
- `"I will reset usage limits"`
- `"GPT-5.5" Codex reset`

이렇게 하면 실행당 request 수를 5개로 유지하면서 지나치게 복잡한 OR/operator 조합을 피할 수 있습니다. 같은 query 안의 OR variant는 Search API request 수를 늘리지는 않지만, Brave는 복잡한 operator query가 결과를 반환하지 않을 수 있다고 문서화합니다. scheduled query는 단순하게 유지하고, wording coverage는 classifier rule과 extra snippets로 보강합니다.

## 필요한 GitHub secrets

| Secret | 용도 |
| --- | --- |
| `BRAVE_SEARCH_API_KEY` | Brave Search API key |
| `DISCORD_WEBHOOK_URL` | actionable notification을 보낼 Discord webhook |

선택 workflow env:

| Env | 기본값 | 용도 |
| --- | --- | --- |
| `SEARCH_FRESHNESS` | `pw` | Brave freshness filter입니다. `pw`는 past week입니다. scheduled monitoring은 freshness 지향 window를 쓰고, backfill은 수동 `workflow_dispatch`에서 `pm` 또는 `py`로 override합니다. |
| `SEARCH_COUNT` | `20` | query마다 요청하는 web result 수입니다. request 수를 줄이거나 늘리는 값이 아닙니다. |
| `SEARCH_EXTRA_SNIPPETS` | `true` | 각 result에 대해 Brave alternative excerpt를 요청합니다. query request를 추가하지 않고 classification evidence를 늘릴 수 있습니다. |
| `DEBUG_SEARCH_RESULTS` | `true` | Actions output에 query별 raw result URL/title을 출력합니다. raw API payload를 저장하지 않고 missed ID를 진단하기 위한 옵션입니다. |
| `ALERT_LOCALE` | `ko` | Discord message locale입니다. 현재 `ko`, `en`을 지원합니다. |

workflow는 state file commit을 위해 아래 권한도 필요합니다.

```yaml
permissions:
  contents: write
```

## 로컬 사용

의존성 설치:

```bash
npm install
```

검증 실행:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

network 없이 mock search fixture로 실행:

```bash
STATE_PATH=/tmp/codex-limit-watch.json MOCK_SEARCH_FIXTURE=test/fixtures/search-results.json DRY_RUN=1 npm run watch
```

실제 Search API를 사용하되 Discord 알림은 보내지 않기:

```bash
BRAVE_SEARCH_API_KEY=... DRY_RUN=1 npm run watch
```

실제 실행:

```bash
BRAVE_SEARCH_API_KEY=... DISCORD_WEBHOOK_URL=... npm run watch
```

`DRY_RUN=1`은 Discord 발송만 막습니다. Search API 호출을 mock하지는 않습니다. 완전 offline 실행은 `MOCK_SEARCH_FIXTURE=...`를 사용하세요.

## Search provider 제약

source boundary는 의도적으로 좁게 유지합니다.

- MVP에서 X API 사용 없음
- 직접 `x.com` page fetch 없음
- X scraping, browser automation, RSS, Nitter, unofficial mirror 사용 없음
- search-result HTML scraping 없음
- 공식 Search API provider response만 사용

기본 provider는 Brave Search API입니다. workflow는 `SEARCH_FRESHNESS=pw`, `SEARCH_COUNT=20`을 설정해 최근 색인 post에 bias를 두되, request 수는 `SEARCH_COUNT`가 아니라 고정 query list가 결정합니다. Brave는 API key header를 사용하는 web search endpoint를 문서화하고, 자체 independent index를 기반으로 한다고 설명합니다. Brave는 pricing/plan과 storage rights 관련 사항도 문서화하므로, 이 프로젝트는 raw API payload 대신 최소 evidence metadata만 저장합니다.

기본값을 바꾸기 전에 다시 확인할 provider 문서:

- Brave Search API: <https://brave.com/search/api/> 및 <https://api-dashboard.search.brave.com/api-reference/web/search/post>
- Google Custom Search JSON API: <https://developers.google.com/custom-search/v1/overview> — Google이 신규 고객 종료와 기존 고객 전환 deadline을 문서화하므로 MVP default가 아닙니다.
- Microsoft Bing Search APIs: <https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement> — legacy Bing Search APIs는 2025년 8월 11일 retired 되었으므로 구현 대상이 아닙니다.

## Search result 진단

`DEBUG_SEARCH_RESULTS=true`이면 candidate filtering 전에 query별 raw Search API result URL과 compact title을 출력합니다. 누락된 post가 Brave result에 없었는지, URL filtering에서 버려졌는지, classification/state 단계에서 suppress됐는지 구분하는 데 사용합니다. bot은 여전히 최소 state metadata만 저장하며 raw payload는 저장하지 않습니다.

## Freshness와 정확도 한계

이 bot은 best-effort search-alert bot입니다. 보장된 real-time X timeline watcher가 아닙니다. Search indexing은 지연되거나 post를 누락할 수 있고, snippet이 분류하기에 너무 얇을 수 있습니다. classifier는 conservative하게 동작합니다. title/snippet/query evidence에 actionable reset 또는 policy-change signal이 있을 때만 알림을 보냅니다.

Discord 발송은 성공했지만 workflow가 state commit 전에 실패하면 다음 실행에서 중복 알림이 발생할 수 있습니다. MVP는 이 at-least-once delivery behavior를 명시적으로 허용합니다.

## State model

`.state/codex-limit-watch.json`은 source별 state를 저장합니다.

- `observedResults`: canonical status URL, evidence hash, last classification, first/last seen time, query hits
- `notifiedIds`: successful actionable notification을 보낸 status ID 목록
- `maxObservedId`: 진단용 값입니다. Search result는 reliable chronological cursor가 아닙니다.

이전에 non-actionable이거나 thin result였던 항목은 provider evidence가 바뀌었거나, 이전 classification이 non-actionable이거나, 짧은 retry window 안이면 재분류됩니다.

## Implementation plan

승인된 OMX plan은 아래에 있습니다.

```text
.omx/plans/ralplan-codex-limit-sentinel.md
```
