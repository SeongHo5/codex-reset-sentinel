import type { Notification, Notifier } from "./Notifier.js";
import { confidenceLabel, eventLabel, type AlertLocale } from "./messages.js";

export class DiscordNotifier implements Notifier {
  constructor(
    private readonly webhookUrl: string,
    private readonly locale: AlertLocale = "ko",
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    if (!webhookUrl) {
      throw new Error("DISCORD_WEBHOOK_URL is required unless DRY_RUN=1.");
    }
  }

  async notify(notification: Notification): Promise<void> {
    const response = await this.fetchImpl(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: formatDiscordMessage(notification, this.locale) }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`);
    }
  }
}

export class DryRunNotifier implements Notifier {
  readonly sent: Notification[] = [];

  constructor(private readonly locale: AlertLocale = "ko") {}

  async notify(notification: Notification): Promise<void> {
    this.sent.push(notification);
    console.log(`[dry-run] would notify ${notification.candidate.eventType} ${notification.candidate.canonicalUrl}`);
    console.log(formatDiscordMessage(notification, this.locale));
  }
}

export function formatDiscordMessage({ candidate, checkedAt }: Notification, locale: AlertLocale = "ko"): string {
  const snippet = candidate.snippet || candidate.title || fallbackSnippet(locale);
  if (locale === "en") {
    return [
      "🚨 Codex Limit Update Detected",
      "",
      `Type: ${candidate.eventType} (${eventLabel(candidate.eventType, locale)})`,
      `Confidence: ${confidenceLabel(candidate.confidence, locale)}`,
      "Author target: Tibo (@thsottiaux)",
      `Detected via: ${candidate.provider} Search result snippet`,
      `Checked: ${formatKst(checkedAt)} KST`,
      "",
      "Snippet:",
      truncate(snippet, 500),
      "",
      "Original:",
      candidate.canonicalUrl,
    ].join("\n");
  }

  return [
    "🚨 Codex 제한 업데이트 감지",
    "",
    `유형: ${candidate.eventType} (${eventLabel(candidate.eventType, locale)})`,
    `신뢰도: ${confidenceLabel(candidate.confidence, locale)}`,
    "감시 대상: Tibo (@thsottiaux)",
    `감지 경로: ${candidate.provider} 검색 결과 스니펫`,
    `확인 시각: ${formatKst(checkedAt)} KST`,
    "",
    "검색 근거:",
    truncate(snippet, 500),
    "",
    "원문:",
    candidate.canonicalUrl,
  ].join("\n");
}

function fallbackSnippet(locale: AlertLocale): string {
  return locale === "ko" ? "(검색 제공자가 스니펫을 반환하지 않음)" : "(no snippet returned by search provider)";
}

function formatKst(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
