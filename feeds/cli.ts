import { parseArgs } from "@std/cli";
import { ensureDir } from "@std/fs";
import { join as joinPath } from "@std/path/join";
import * as colors from "@std/fmt/colors";
import {
  discoverFeed,
  type FeedData,
  type FeedItem,
  fetchFeedItemsFromURL,
  fetchFeedMetadata,
  type FetchResults,
  FilePersistence,
  mapToFeedItems,
  parseInputToURL,
} from "./main.ts";
import pkg from "./deno.json" with { type: "json" };
import app from "./reader.ts";
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
/** where feed items are stored */
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

/**
 * Checks if config exists at given path and returns boolean
 *
 * @param path path to config file
 * @returns if the config file exists or not
 * @throws `Deno.errors.NotFound` if file doesn't exists
 */
export async function configExists(
  path: Paths["config"],
): Promise<boolean> {
  try {
    const config = path;
    if (config) {
      const file = await Deno.readFile(config);
      if (file) return true;
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(colors.red("error"), "config file doesn't exist");
    }
  }
  return false;
}

async function resolvePaths(): Promise<Paths | undefined> {
  const root = resolveRootDirectory();

  if (!root) return;

  await ensureDir(root);
  const config = joinPath(root, CONFIG_FILENAME);
  const sources = joinPath(root, SOURCES_FILENAME);
  const items = joinPath(root, ITEMS_FILENAME);
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

/**
 * thrown whenever a command is not implemented yet
 */
class NotImplementedError extends Error {
  /**
   * @example
   * ```ts
   * throw new NotImplementedError();
   * ```
   *
   * @param message override default error message
   */
  constructor(
    message: string = "Not Implemented!",
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
  ${colors.yellow("list")}          - list subscribed feed sources
  ${colors.yellow("subscribe")}     - subscribe to new feed source
  ${colors.yellow("unsubscribe")}   - delete feed source
  ${colors.yellow("fetch")}         - update feed source
  ${colors.yellow("reader")}        - start http server for reading feeds
  ${colors.yellow("upgrade")}       - upgrade cli to latest version
  `);
  return 0;
}

const listCommand = async (
  args: ParsedArguments,
  feeds: FeedData[],
  store: FilePersistence,
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
  store: FilePersistence,
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
  store: FilePersistence,
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

const fetchCommand = async (
  args: ParsedArguments,
  feeds: FeedData[],
  store: FilePersistence,
): Promise<number> => {
  if (feeds.length === 0) {
    console.error(colors.red("error"), "feeds empty, nothing to fetch");
    return 1;
  }

  for (const feed of feeds) {
    try {
      const url = new URL(feed.url);
      const exists = feeds.find((value) =>
        new URL(value.url).hostname === url?.hostname
      );
      const metadata: FeedData = await fetchFeedMetadata(url);
      const results: FetchResults = await fetchFeedItemsFromURL(
        url,
        feed,
      );
      const status = results.fetch.status;
      if (status === "not-modified") continue;
      const body = results.body;
      if (!body) {
        console.warn(
          colors.yellow("warning"),
          `empty body for feed ${feed.url}`,
        );
        continue;
      }
      let parsed;
      try {
        parsed = parseFeed(body);
      } catch (error) {
        if (error) {
          console.error(colors.red("error"), { error });
          return 1;
        }
        throw error;
      }
      const items: FeedItem[] = mapToFeedItems(parsed, body, metadata, url);
      await store.saveFeeds(feeds);
      await store.saveItems(feed.id, items, feeds);
      parsed = null;
      console.log(colors.green("ok"), `saved feed items for ${url.hostname}`);
    } catch (error) {
      throw error;
    }
  }

  store.saveFeeds(feeds);
  console.log(
    colors.cyan("info"),
    `fetched and saved metadata for feed sources`,
  );

  return 0;
};

const notImplementedCommand = () => {
  try {
    throw new NotImplementedError();
  } catch (error) {
    if (Error?.isError(error)) {
      console.error(colors.red("error"), error.message);
      return 1;
    }
    throw error;
  }
};
/**
 * the type returned by {@linkcode parseArgs}
 */
export type ParsedArguments = {
  [x: string]: unknown;
  _: Array<string | number>;
};

async function updateFeedSource(feeds: FeedData[], store: FilePersistence) {
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
  store.saveFeeds(updated);
  console.log(colors.green("done"), `saved changes to ${store.filePath}`);
}

async function readerCommand(
  args: ParsedArguments,
  feeds: FeedData[],
  store: FilePersistence,
  paths: Paths,
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
  store: FilePersistence,
  paths: Paths,
): Promise<number | void> {
  const [command, ...rest] = args;
  const parsedArgs = parseArgs(rest);

  const feeds = await store.loadFeeds();

  switch (command) {
    case "list":
      return await listCommand(parsedArgs, feeds, store);
    case "subscribe":
      return await subscribeCommand(parsedArgs, feeds, store);
    case "unsubscribe":
      return await unsubscribeCommand(parsedArgs, feeds, store);
    case "fetch":
      return await fetchCommand(parsedArgs, feeds, store);
    case "reader":
      return await readerCommand(parsedArgs, feeds, store, paths);
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
    const store = new FilePersistence(paths.sources);
    const code = await main(Deno.args, store, paths);
    if (typeof code === "number") Deno.exit(code);
  } catch (error) {
    if (error instanceof CommandError) {
      console.error(colors.red("error"), error.message);
      Deno.exit(error.exitCode);
    }
    throw error;
  }
}
