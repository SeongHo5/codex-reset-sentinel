import type { Notification, Notifier } from "./Notifier.js";

export class DiscordNotifier implements Notifier {
  constructor(private readonly webhookUrl: string, private readonly fetchImpl: typeof fetch = fetch) {
    if (!webhookUrl) {
      throw new Error("DISCORD_WEBHOOK_URL is required unless DRY_RUN=1.");
    }
  }

  async notify(notification: Notification): Promise<void> {
    const response = await this.fetchImpl(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: formatDiscordMessage(notification) }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`);
    }
  }
}

export class DryRunNotifier implements Notifier {
  readonly sent: Notification[] = [];

  async notify(notification: Notification): Promise<void> {
    this.sent.push(notification);
    console.log(`[dry-run] would notify ${notification.candidate.eventType} ${notification.candidate.canonicalUrl}`);
  }
}

export function formatDiscordMessage({ candidate, checkedAt }: Notification): string {
  const snippet = candidate.snippet || candidate.title || "(no snippet returned by search provider)";
  return [
    "🚨 Codex Limit Update Detected",
    "",
    `Type: ${candidate.eventType}`,
    `Confidence: ${candidate.confidence}`,
    "Author target: Tibo (@thsottiaux)",
    `Detected via: ${candidate.provider} Search result snippet`,
    `Checked: ${formatKst(checkedAt)}`,
    "",
    "Snippet:",
    truncate(snippet, 500),
    "",
    "Original:",
    candidate.canonicalUrl,
  ].join("\n");
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
