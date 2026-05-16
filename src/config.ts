import { normalizeAlertLocale, type AlertLocale } from "./notify/messages.js";

export type Config = {
  searchProvider: "brave" | "fixture";
  braveApiKey?: string;
  discordWebhookUrl?: string;
  statePath: string;
  dryRun: boolean;
  mockSearchFixture?: string;
  searchCount: number;
  searchFreshness?: string;
  alertLocale: AlertLocale;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const mockSearchFixture = env.MOCK_SEARCH_FIXTURE;
  const dryRun = env.DRY_RUN === "1" || env.DRY_RUN?.toLowerCase() === "true";
  const searchProvider = mockSearchFixture ? "fixture" : ((env.SEARCH_PROVIDER ?? "brave").toLowerCase() as Config["searchProvider"]);

  if (searchProvider !== "brave" && searchProvider !== "fixture") {
    throw new Error(`Unsupported SEARCH_PROVIDER: ${searchProvider}`);
  }

  if (searchProvider === "brave" && !env.BRAVE_SEARCH_API_KEY) {
    throw new Error("BRAVE_SEARCH_API_KEY is required for SEARCH_PROVIDER=brave. Use MOCK_SEARCH_FIXTURE for no-network tests.");
  }

  if (!dryRun && !env.DISCORD_WEBHOOK_URL) {
    throw new Error("DISCORD_WEBHOOK_URL is required unless DRY_RUN=1.");
  }

  const searchCount = parsePositiveInt(env.SEARCH_COUNT, 20);

  return {
    searchProvider,
    braveApiKey: env.BRAVE_SEARCH_API_KEY,
    discordWebhookUrl: env.DISCORD_WEBHOOK_URL,
    statePath: env.STATE_PATH ?? ".state/codex-limit-watch.json",
    dryRun,
    mockSearchFixture,
    searchCount,
    searchFreshness: env.SEARCH_FRESHNESS ?? "pd",
    alertLocale: normalizeAlertLocale(env.ALERT_LOCALE),
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
