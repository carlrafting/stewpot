import { parseArgs } from "@std/cli";
import { ensureDir } from "@std/fs";
import { join as joinPath } from "@std/path/join";
import * as colors from "@std/fmt/colors";
import {
  discoverFeed,
  type FeedData,
  type FeedItem,
  fetchAllFeeds,
  fetchFeedItemsFromURL,
  fetchFeedMetadata,
  type FetchResults,
  fetchSingleFeed,
  mapToFeedItems,
  parseInputToURL,
  tryFetchAndParse,
} from "./main.ts";
import pkg from "./deno.json" with { type: "json" };
import app from "./reader.ts";
import { type Configuration, loadConfig, writeConfigToPath } from "./config.ts";
import { createStorage, type FsStorage, type KvStorage } from "./storage.ts";
import { parseFeed } from "feedsmith";

/**
 * This module contains code related to CLI
 * @module
 */

/** defines where data are stored */
const ENV_CLI_DIR = "STEWPOT_FEEDS_CLI_ROOT";
/** parent directory within user home directory */
const PARENT_DIRNAME = ".stewpot";
/** where data and config are stored */
const ROOT_DIRNAME = "feeds";
/** where configuration is stored */
const CONFIG_FILENAME = "config.js";
/** previous filename for storing sources */
const PREV_SOURCES_FILENAME = "feeds.json";
/** where feed sources metadata are stored */
const SOURCES_FILENAME = "sources.json";
/** where feed items are stored @deprecated */
const ITEMS_FILENAME = "items.json";
/** where feed items are stored */
const ITEMS_DIRNAME = "items";
/** where KV data is stored */
const KV_FILENAME = "kv.db";

export {
  CONFIG_FILENAME,
  ENV_CLI_DIR,
  ITEMS_DIRNAME,
  ITEMS_FILENAME,
  KV_FILENAME,
  PARENT_DIRNAME,
  PREV_SOURCES_FILENAME,
  ROOT_DIRNAME,
  SOURCES_FILENAME,
};

/** paths used for file & kv storage */
export interface Paths {
  /** path to root directory */
  root: string;
  /** path to sources file */
  sources: string;
  /** path to config file */
  config?: string;
  /** path items directory */
  items?: string;
  /** path to kv file */
  kv?: string;
}

async function resolvePaths(): Promise<Paths | undefined> {
  const root = resolveRootDirectory();

  if (!root) return;

  await ensureDir(root);
  const config = joinPath(root, CONFIG_FILENAME);
  const sources = joinPath(root, SOURCES_FILENAME);
  const items = joinPath(root, ITEMS_DIRNAME);
  const kv = joinPath(root, KV_FILENAME);

  return {
    root,
    config,
    sources,
    items,
    kv,
  };
}

function resolveRootDirectory(): string | undefined {
  const env = Deno.env;
  const parent = PARENT_DIRNAME;
  const root = ROOT_DIRNAME;

  const override = env.get(ENV_CLI_DIR);
  if (override) return override;

  const home = resolveUserHomeDirectory();
  if (home) {
    return joinPath(home, parent, root);
  }
}

function resolveUserHomeDirectory(): string {
  const env = Deno.env;
  const os = Deno.build.os;

  if (os === "windows") {
    const home = env.get("USERPROFILE");
    if (home) {
      return home;
    }
  }

  if (os === "linux" || os === "darwin") {
    const home = env.get("HOME");
    if (home) {
      return home;
    }
  }

  throw new Error("unable to resolve user home directory");
}

class CommandError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1,
  ) {
    super(message);
  }
}

function help() {
  console.log(`
${colors.cyan(pkg.name)} - v${pkg.version}

${colors.green("Description")}:
  Small CLI program for managing & consuming feeds of different kinds (RSS/Atom/JSON).

${colors.green("Usage")}:
  Run directly from JSR:
    $ deno -RWNE jsr:${pkg.name}/cli <command>

  When installed on system:
    $ feeds <command>

${colors.green("Commands")}:
  ${colors.yellow("init")}          - init cli config
  ${colors.yellow("list")}          - list subscribed feed sources
  ${colors.yellow("subscribe")}     - subscribe to new feed source
  ${colors.yellow("unsubscribe")}   - delete feed source
  ${colors.yellow("fetch")}         - update feed source
  ${colors.yellow("reader")}        - start http server for reading feeds
  ${colors.yellow("upgrade")}       - upgrade cli to latest version
  `);
  return 0;
}

const initCommand = async (
  paths: Paths,
  args: ParsedArguments,
): Promise<number> => {
  if (paths.config) {
    try {
      const file = await Deno.open(paths.config, { read: true });
      console.log(colors.cyan("info"), "config already exists!");
      file.close();
    } catch {
      await writeConfigToPath(paths.config);
      console.log(colors.cyan("info"), `wrote config file to ${paths.config}`);
    }
    return 0;
  }
  console.error(colors.red("error"), "config file path was undefined");
  return 1;
};

const listCommand = async (
  args: ParsedArguments,
  feeds: FeedData[],
  store: FsStorage | KvStorage,
): Promise<number> => {
  if (feeds.length === 0) {
    console.error(colors.red("error"), "there are no feeds");
    return 1;
  }

  if (args?.update) {
    await updateFeedSource(feeds, store);
    return 0;
  }

  for (const feed of feeds) {
    console.dir(feed);
  }

  return 0;
};

const subscribeCommand = async (
  args: ParsedArguments,
  feeds: FeedData[],
  store: FsStorage | KvStorage,
): Promise<number> => {
  const [input] = args._;

  if (typeof input !== "string") {
    console.error(colors.red("error"), "invalid input format!");
    return 1;
  }

  const url = parseInputToURL(input);

  if (!url) {
    return 1;
  }

  const exists = feeds.find((value) => value.url === url?.href);

  if (exists) {
    console.error(colors.red("error"), "URL already exists!");
    return 1;
  }

  if (url?.pathname === "/") {
    const oldHref = url.href;
    const feedURL = await discoverFeed(url.href);
    if (feedURL && feedURL !== url.href) {
      url.href = feedURL;
    }
    const ok = prompt(
      `subscribe to discovered feed for "${url.hostname}" at "${url.href}"? [y/N]`,
    )?.toLocaleLowerCase();
    if (ok !== "y" && ok !== "yes") {
      url.href = oldHref;
      return 1;
    }
  }

  const metadata: FeedData = await fetchFeedMetadata(url);
  const fetchResults: FetchResults = await fetchFeedItemsFromURL(url, metadata);
  const content = fetchResults.body;

  if (!content || content.trim() === "") {
    throw new Error("no content for feed source");
  }

  let parsed;
  try {
    parsed = parseFeed(content);
  } catch (error) {
    if (error) {
      console.error(colors.red("error"), { error });
      return 1;
    }
    throw error;
  }

  const items: FeedItem[] = mapToFeedItems(parsed, content, metadata, url);

  parsed = null;

  feeds.push(metadata);
  await store.saveFeeds(feeds);
  await store.saveItems(metadata.id, items, feeds);
  console.log(colors.green("done"), `saved feed items for ${url.hostname}`);

  console.log(colors.green("subscribed!"), metadata.url);

  return 0;
};

const unsubscribeCommand = async (
  args: ParsedArguments,
  feeds: FeedData[],
  store: FsStorage | KvStorage,
): Promise<number> => {
  const [input] = args._;
  if (typeof input !== "string") {
    console.error(colors.red("error"), "invalid input format!");
    return 1;
  }
  const url = parseInputToURL(input);
  const exists = feeds.find((value) =>
    new URL(value.url).hostname === url?.hostname
  );
  if (!exists) {
    console.error(
      colors.red("error"),
      `feed source doesn't exist for ${url?.hostname}`,
    );
    return 1;
  }
  const filtered = feeds.filter((item) =>
    new URL(item.url).hostname !== url?.hostname
  );
  if (filtered.length >= 0) {
    await store.saveFeeds(filtered);
    console.log(colors.green("ok"), `unsubscribed to ${url?.href}`);
  }
  await store.removeItems(exists?.id);
  console.log(colors.green("done"), `remove feed items for ${url?.hostname}`);
  return 0;
};

type TryFetchAndParseResults = {
  metadata: FeedData;
  parsed: {
    format: "rss";
    feed: import("feedsmith/types").DeepPartial<
      import("feedsmith/types").Rss.Feed<string>
    >;
  } | {
    format: "atom";
    feed: import("feedsmith/types").DeepPartial<
      import("feedsmith/types").Atom.Feed<string>
    >;
  } | {
    format: "rdf";
    feed: import("feedsmith/types").DeepPartial<
      import("feedsmith/types").Rdf.Feed<string>
    >;
  } | {
    format: "json";
    feed: import("feedsmith/types").DeepPartial<
      import("feedsmith/types").Json.Feed<string>
    >;
  };
  body: string;
  url: URL;
};

async function tryFetchAndParse(
  feed: FeedData,
): Promise<
  TryFetchAndParseResults | undefined
> {
  try {
    const url = new URL(feed.url);
    const metadata: FeedData = await fetchFeedMetadata(url);
    const results: FetchResults = await fetchFeedItemsFromURL(
      url,
      feed,
    );
    const status = results.fetch.status;
    if (status === "not-modified") return;
    const body = results.body;
    if (!body) {
      console.warn(
        colors.yellow("warning"),
        `empty body for feed ${feed.url}`,
      );
      return;
    }
    try {
      const parsed = parseFeed(body);
      return {
        metadata,
        parsed,
        body,
        url,
      };
    } catch (error) {
      if (error) {
        console.error(colors.red("error"), { error });
        return;
      }
      throw error;
    }
  } catch (error) {
    if (error) {
      console.error(colors.red("error"), { error });
      return;
    }
    throw error;
  }
}

async function processFetchAndParseResult(
  feed: FeedData,
  results: TryFetchAndParseResults,
  store: FsStorage | KvStorage,
  feeds: FeedData[],
) {
  const items: FeedItem[] = mapToFeedItems(
    results.parsed,
    results.body,
    results.metadata,
    results.url,
  );
  await store.saveItems(feed.id, items, feeds);
}

async function fetchSingleFeed(
  input: string | number,
  feeds: FeedData[],
  store: FsStorage | KvStorage,
): Promise<TryFetchAndParseResults | undefined> {
  if (typeof input !== "string") return;
  const url = parseInputToURL(input);
  if (!url) return;
  const exists = feeds.find((value) =>
    new URL(value.url).hostname === url?.hostname
  );
  if (!exists) {
    console.error(
      colors.red("error"),
      "Couldn't find a feed source with the provided URL.",
      url.hostname,
    );
    return;
  }
  const results = await tryFetchAndParse(exists);
  if (!results) return;
  await processFetchAndParseResult(exists, results, store, feeds);
  return results;
}

async function fetchAllFeeds(
  feeds: FeedData[],
  store: FsStorage | KvStorage,
): Promise<void> {
  for (const feed of feeds) {
    const results = await tryFetchAndParse(feed);
    if (!results) continue;
    await processFetchAndParseResult(feed, results, store, feeds);
    console.log(
      colors.green("ok"),
      `saved feed items for ${results.url.hostname}`,
    );
  }
}

const fetchCommand = async (
  args: ParsedArguments,
  feeds: FeedData[],
  store: FsStorage | KvStorage,
): Promise<number> => {
  const [input] = args._;

  if (feeds.length === 0) {
    console.error(colors.red("error"), "feeds empty, nothing to fetch");
    return 1;
  }

  if (!input) {
    await fetchAllFeeds(feeds, store);
    await store.saveFeeds(feeds);
    console.log(
      colors.cyan("info"),
      `fetched and saved metadata for feed sources`,
    );
    return 0;
  }

  const results = await fetchSingleFeed(input, feeds, store);

  if (results) {
    await store.saveFeeds(feeds);
    console.log(
      colors.green("ok"),
      `saved feed items for ${results.url.hostname}`,
    );
  }

  return 0;
};

/**
 * the type returned by {@linkcode parseArgs}
 */
export type ParsedArguments = {
  [x: string]: unknown;
  _: Array<string | number>;
};

async function updateFeedSource(
  feeds: FeedData[],
  store: KvStorage | FsStorage,
) {
  const updated: FeedData[] = [];
  for (const feed of feeds) {
    const url = new URL(feed.url);
    console.log(
      colors.cyan("info"),
      `fetching and updating feed source metadata for ${url.hostname}`,
    );
    const metadata = await fetchFeedMetadata(url);
    updated.push(metadata);
  }
  await store.saveFeeds(updated);
  console.log(colors.green("done"), `saved changes to store`);
}

async function readerCommand(
  _config: Configuration,
  paths: Paths,
  args: ParsedArguments,
  feeds: FeedData[],
  store: FsStorage | KvStorage,
): Promise<void> {
  const controller = new AbortController();
  const signal = controller.signal;
  const handler = await app(args, feeds, store, paths);
  const port = 8000;
  const serveOptions: Deno.ServeInit | Deno.ServeTcpOptions = {
    port,
    signal,
    onListen({ port, hostname }) {
      console.log(
        colors.cyan("info"),
        `Serving reader at http://${hostname}:${port}`,
      );
      console.log(colors.cyan("info"), "Press Ctrl+C to exit");
    },
  };
  const server = Deno.serve(serveOptions, handler.fetch);
  Deno.addSignalListener("SIGINT", async () => {
    console.log("\n");
    console.log(colors.cyan("info"), "shutting down reader...");
    await server.shutdown();
  });
  await server.finished;
  console.log(
    colors.green("done"),
    "reader shutdown was finished successfully",
  );
}

const upgradeCommand = async () => {
  const controller = new AbortController();
  const signal = controller.signal;
  const args = [
    "install",
    "--reload",
    "-f",
    "-RWNE",
    "--allow-run",
    "-g",
    `jsr:${pkg.name}/cli`,
  ];
  const command = new Deno.Command(Deno.execPath(), {
    args,
    signal,
  });
  const info = await command.output();
  if (info.success) {
    console.log(
      "✅",
      colors.cyan(pkg.name),
      "was successfully upgraded to latest version",
    );
    return info.code;
  }
  console.log(
    colors.red("error"),
    "there was a problem upgrading to the latest version",
  );
  return 1;
};

async function main(
  args: string[],
  config: Configuration,
  store: FsStorage | KvStorage,
  paths: Paths,
): Promise<number | void> {
  const [command, ...rest] = args;
  const parsedArgs = parseArgs(rest);

  const feeds = await store.loadFeeds();

  switch (command) {
    case "init":
      return await initCommand(paths, parsedArgs);
    case "list":
      return await listCommand(parsedArgs, feeds, store);
    case "subscribe":
      return await subscribeCommand(parsedArgs, feeds, store);
    case "unsubscribe":
      return await unsubscribeCommand(parsedArgs, feeds, store);
    case "fetch":
      return await fetchCommand(parsedArgs, feeds, store);
    case "reader":
      return await readerCommand(config, paths, parsedArgs, feeds, store);
    case "upgrade":
      return await upgradeCommand();
    case "--help":
    case "-h":
    case undefined:
      return help();
    default:
      throw new CommandError(`unknown command: ${command}`);
  }
}

if (import.meta.main) {
  try {
    const paths = await resolvePaths();
    if (!paths) throw "couldn't resolve paths";
    const config = await loadConfig(paths.config);
    const store = await createStorage(config?.storage, paths);
    const code = await main(Deno.args, config, store, paths);
    if (typeof code === "number") Deno.exit(code);
  } catch (error) {
    if (error instanceof CommandError) {
      console.error(colors.red("error"), error.message);
      Deno.exit(error.exitCode);
    }
    throw error;
  }
}
