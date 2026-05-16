export type Config = {
  searchProvider: "brave" | "fixture";
  braveApiKey?: string;
  discordWebhookUrl?: string;
  statePath: string;
  dryRun: boolean;
  mockSearchFixture?: string;
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

  return {
    searchProvider,
    braveApiKey: env.BRAVE_SEARCH_API_KEY,
    discordWebhookUrl: env.DISCORD_WEBHOOK_URL,
    statePath: env.STATE_PATH ?? ".state/codex-limit-watch.json",
    dryRun,
    mockSearchFixture,
  };
}
