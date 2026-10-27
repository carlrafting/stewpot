import { resolvePaths } from "../cli/main.ts";
import { loadConfig } from "./config.ts";
import { createServer } from "./server.ts";
import { createStorage } from "./storage.ts";

async function main() {
  const options = {};
  const paths = await resolvePaths();
  if (!paths) throw new Error("Failed to resolve paths!");
  const config = await loadConfig(paths?.config);
  const store = await createStorage(config.storage, paths);
  const feeds = await store.loadFeeds();
  await createServer(config, options, feeds, store);
}

if (import.meta.main) {
  await main();
}
