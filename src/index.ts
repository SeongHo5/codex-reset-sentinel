import { loadConfig } from "./config.js";
import { DiscordNotifier, DryRunNotifier } from "./notify/DiscordNotifier.js";
import type { SearchProvider } from "./search/SearchProvider.js";
import { BraveSearchProvider } from "./search/providers/BraveSearchProvider.js";
import { FixtureSearchProvider } from "./search/providers/FixtureSearchProvider.js";
import { runWatch } from "./run/watch.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const searchProvider = createSearchProvider(config);
  const notifier = config.dryRun ? new DryRunNotifier(config.alertLocale) : new DiscordNotifier(config.discordWebhookUrl!, config.alertLocale);
  const summary = await runWatch({ config, searchProvider, notifier });
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function createSearchProvider(config: ReturnType<typeof loadConfig>): SearchProvider {
  if (config.searchProvider === "fixture") {
    return new FixtureSearchProvider(config.mockSearchFixture!);
  }
  return new BraveSearchProvider(config.braveApiKey!, { count: config.searchCount, freshness: config.searchFreshness });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
