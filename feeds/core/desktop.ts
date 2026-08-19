import { resolvePaths } from "../cli/main.ts";
import { loadConfig } from "./config.ts";
import { createServer } from "./server.ts";
import { createStorage } from "./storage.ts";

const options = {};
const paths = await resolvePaths();
if (!paths) throw "paths error!";
const config = await loadConfig(paths?.config);
const store = await createStorage(config.storage, paths);
const feeds = await store.loadFeeds();
await createServer(config, options, feeds, store);
