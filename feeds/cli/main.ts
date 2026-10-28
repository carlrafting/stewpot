import { parseArgs, type ParseOptions } from "@std/cli";
import * as colors from "@std/fmt/colors";
import { join } from "@std/path/join";
import { ensureDir } from "@std/fs";
import { parseFeed } from "feedsmith";
import {
  type Configuration,
  loadConfig,
  writeConfigToPath,
} from "../core/config.ts";
import {
  discoverFeed,
  type FeedData,
  type FeedItem,
  type FetchedFeed,
  fetchFeedItemsFromURL,
  fetchFeedMetadata,
  type FetchResults,
  mapToFeedItems,
  parseInputToURL,
} from "../core/main.ts";
import {
  createStorage,
  type FsStorage,
  type KvStorage,
  type Storage,
} from "../core/storage.ts";
import pkg from "../deno.json" with { type: "json" };
import { createServer } from "../core/server.ts";
import {
  type CLIDeps,
  type Command,
  handleArgs,
  type Input,
  type Options,
  type ParsedArguments,
  resolvePath,
} from "@stewpot/cli";

export type { CLIDeps, Command, Input, Options, ParsedArguments };
export type { Configuration, Storage };
export type { FsStorageConfig, KvStorageConfig } from "../core/config.ts";
export { FsStorage, KvStorage };

/**
 * This module contains code related to feeds CLI
 * @module
 */

/** where configuration is stored */
const CONFIG_FILENAME = "config.js";
/** where feed sources metadata are stored */
const SOURCES_FILENAME = "sources.json";
/** where feed items are stored */
const ITEMS_DIRNAME = "items";
/** where KV data is stored */
const KV_FILENAME = "kv.db";

export { CONFIG_FILENAME, ITEMS_DIRNAME, KV_FILENAME, SOURCES_FILENAME };

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

const resolveRootDirectory = () => resolvePath("feeds");

/** Resolves the feed CLI's storage and configuration paths. */
export async function resolvePaths(base?: string): Promise<Paths | undefined> {
  const root = base ?? resolveRootDirectory();

  if (!root) return;

  await ensureDir(root);
  const config = join(root, CONFIG_FILENAME);
  const sources = join(root, SOURCES_FILENAME);
  const items = join(root, ITEMS_DIRNAME);
  const kv = join(root, KV_FILENAME);

  return {
    root,
    config,
    sources,
    items,
    kv,
  };
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
 * shared dependencies commands can make use of
 */
export interface Deps extends CLIDeps {
  /** Feed subscriptions available to the command. */
  feeds: FeedData[];
  /** storage type used by CLI */
  store: FsStorage | KvStorage;
  /** common paths used by CLI */
  paths: Paths;
  /** CLI configuration {@linkcode Configuration} */
  config: Configuration;
  /** only used for backwards compability @deprecated */
  args: ParsedArguments;
}

/** Returns the first positional argument after the command name. */
export function getCommandInput(args: ParsedArguments): string | undefined {
  const [, input] = args._;
  return typeof input === "string" ? input : undefined;
}

/** Resolves a feed input string to a URL, adding HTTPS when needed. */
export function resolveFeedInput(
  input: string | number | undefined,
): URL | undefined {
  if (typeof input !== "string" || !input.trim()) return;
  return parseInputToURL(input.trim());
}

/** Finds a subscription by exact URL or matching hostname. */
export function findFeedByUrl(
  feeds: FeedData[],
  value: URL | string | undefined,
): FeedData | undefined {
  const url = typeof value === "string" ? resolveFeedInput(value) : value;
  if (!url) return undefined;

  return feeds.find((feed) => {
    try {
      const current = new URL(feed.url);
      return current.href === url.href || current.hostname === url.hostname;
    } catch {
      return false;
    }
  });
}

/** Removes the subscription matching the given URL or hostname. */
export function removeFeedByUrl(
  feeds: FeedData[],
  value: URL | string | undefined,
): FeedData[] {
  const target = findFeedByUrl(feeds, value);
  if (!target) return feeds;
  return feeds.filter((feed) => feed.id !== target.id);
}

/** Adds a subscription and persists its metadata and items. */
export async function persistFeedSubscription(
  store: Storage,
  feeds: FeedData[],
  metadata: FeedData,
  items: FeedItem[],
): Promise<void> {
  feeds.push(metadata);
  await store.saveFeeds(feeds);
  await store.saveItems(metadata.id, items, feeds);
}

const init: Command = {
  name: "init",
  description: "init cli config",
  help: `Usage:
  feeds init

Create the default configuration file for feeds. If a configuration file
already exists, it is left unchanged.`,
  async run(
    input: Input,
    options: Options,
    deps: Deps,
  ): Promise<number> {
    if (options.help) {
      return printCommandHelp(init);
    }
    const { paths } = deps;
    if (paths.config) {
      try {
        const file = await Deno.open(paths.config, { read: true });
        console.log(colors.cyan("info"), "config already exists!");
        file.close();
      } catch {
        await writeConfigToPath(paths.config);
        console.log(
          colors.green("ok"),
          `wrote config file to ${paths.config}`,
        );
      }
      return 0;
    }
    console.error(colors.red("error"), "config file path was undefined");
    return 1;
  },
};

const list: Command = {
  name: "list",
  description: "list subscribed feed sources",
  help: `Usage:
  feeds list [--update]

Options:
  --update  Refresh the metadata for each subscribed feed before saving it.`,
  async run(
    _input: Input,
    options: Options,
    _deps: Deps,
    feeds: FeedData[],
    store: FsStorage | KvStorage,
  ): Promise<number> {
    if (options.help) {
      return printCommandHelp(list);
    }

    if (feeds.length === 0) {
      console.error(colors.red("error"), "there are no feeds");
      return 1;
    }

    if (options?.update) {
      await updateFeedSource(feeds, store);
      return 0;
    }

    for (const feed of feeds) {
      console.dir(feed);
    }

    return 0;
  },
};

const subscribe: Command = {
  name: "subscribe",
  description: "subscribe to new feed source",
  help: `Usage:
  feeds subscribe <url>

Arguments:
  url  Feed URL, or a website hostname to discover its feed.

A hostname without a scheme is treated as HTTPS. When subscribing to a
hostname, the discovered feed URL is shown for confirmation. The feed and its
current items are then saved.`,
  async run(
    _input: Input,
    options: Options,
    _deps: Deps,
    args: ParsedArguments,
    feeds: FeedData[],
    store: Storage,
  ) {
    if (options.help) {
      return printCommandHelp(subscribe);
    }

    const input = getCommandInput(args);
    if (typeof input !== "string") {
      console.error(colors.red("error"), "invalid input format!");
      return 1;
    }

    const url = resolveFeedInput(input);
    if (!url) {
      return 1;
    }

    const exists = findFeedByUrl(feeds, url);
    if (exists) {
      console.error(colors.red("error"), "URL already exists!");
      return 1;
    }

    if (url.pathname === "/") {
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
    const fetchResults: FetchResults = await fetchFeedItemsFromURL(
      url,
      metadata,
    );
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

    await persistFeedSubscription(store, feeds, metadata, items);
    console.log(colors.green("done"), `saved feed items for ${url.hostname}`);
    console.log(colors.green("subscribed!"), metadata.url);
    return 0;
  },
};

const unsubscribe: Command = {
  name: "unsubscribe",
  description: "unsubscribe to feed source",
  help: `Usage:
  feeds unsubscribe <url>

Arguments:
  url  URL of the subscribed feed, or its hostname.

Remove the matching subscription and its cached items.`,
  async run(
    _input: Input,
    options: Options,
    _deps: Deps,
    args: ParsedArguments,
    feeds: FeedData[],
    store: Storage,
  ): Promise<number | void> {
    if (options.help) {
      return printCommandHelp(unsubscribe);
    }

    const input = getCommandInput(args);
    if (typeof input !== "string") {
      console.error(colors.red("error"), "invalid input format!");
      return 1;
    }

    const url = resolveFeedInput(input);
    const exists = url ? findFeedByUrl(feeds, url) : undefined;
    if (!exists || !url) {
      console.error(
        colors.red("error"),
        `feed source doesn't exist for ${url?.hostname ?? input}`,
      );
      return 1;
    }

    const filtered = removeFeedByUrl(feeds, url);
    await store.saveFeeds(filtered);
    console.log(colors.green("ok"), `unsubscribed to ${url.href}`);
    await store.removeItems(exists.id);
    console.log(colors.green("done"), `remove feed items for ${url.hostname}`);
    return 0;
  },
};

async function tryFetchAndParse(
  feed: FeedData,
): Promise<
  FetchedFeed | undefined
> {
  try {
    const url = new URL(feed.url);
    const metadata: FeedData = {
      ...await fetchFeedMetadata(url),
      id: feed.id,
    };
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
  results: FetchedFeed,
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
): Promise<FetchedFeed | undefined> {
  if (typeof input !== "string") return;
  const url = resolveFeedInput(input);
  if (!url) return;
  const exists = findFeedByUrl(feeds, url);
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

const fetch: Command = {
  name: "fetch",
  description: "fetch updated feed sources and items",
  help: `Usage:
  feeds fetch [url]

Arguments:
  url  URL or hostname of one subscribed feed to refresh.

With no URL, refresh all subscribed feeds. Updated items and feed metadata are
saved to the configured storage.`,
  async run(
    _input: Input,
    options: Options,
    _deps: Deps,
    feeds: FeedData[],
    store: FsStorage | KvStorage,
  ): Promise<number> {
    if (options.help) {
      return printCommandHelp(fetch);
    }

    const [command, input] = _input;

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
  },
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
    updated.push({
      id: feed.id,
      url: feed.url,
      format: metadata.format,
      fetch_timestamp: metadata.fetch_timestamp,
      etag: metadata.etag,
    });
  }
  await store.saveFeeds(updated);
  console.log(colors.green("done"), `saved changes to store`);
}

const reader: Command = {
  name: "reader",
  description: "start http server for reading feeds",
  help: `Usage:
  feeds reader [--hostname <hostname>] [--port <port>]

Options:
  --hostname  Hostname for the HTTP server (default: localhost).
  --port      Port for the HTTP server (default: 8000).

The hostname and port can also be set in the feeds configuration file.`,
  async run(
    _input: Input,
    options: Options,
    _deps: Deps,
    config: Configuration,
    _paths: Paths,
    _args: ParsedArguments,
    feeds: FeedData[],
    store: FsStorage | KvStorage,
  ): Promise<void | number> {
    if (options.help) {
      return printCommandHelp(reader);
    }
    await createServer(config, options, feeds, store);
  },
};

async function uninstall(): Promise<boolean> {
  console.log(colors.cyan("info"), "uninstall previous version...");
  const signal = new AbortController().signal;
  const [, name] = pkg.name.split("/");
  const args = ["uninstall", "-g", name];
  const command = new Deno.Command(Deno.execPath(), {
    args,
    signal,
  });
  const output = await command.output();
  return output.success;
}

const upgrade: Command = {
  name: "upgrade",
  description: "upgrade cli to latest version",
  help: `Usage:
  feeds upgrade

Reinstall the latest published version of @stewpot/feeds from JSR.`,
  async run(
    _input: Input,
    options: Options,
    ..._rest: unknown[]
  ): Promise<number> {
    if (options.help) {
      return printCommandHelp(upgrade);
    }
    const controller = new AbortController();
    const signal = controller.signal;
    const args = [
      "install",
      "-RWNE",
      "-g",
      "-r",
      "-f",
      "--allow-run",
      `jsr:${pkg.name}/cli`,
    ];
    if (!await uninstall()) {
      console.info(colors.cyan("info"), "nothing to cleanup");
    }
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
  },
};

/** The commands supported by the feeds CLI. */
export const COMMANDS: Command[] = [
  init,
  list,
  subscribe,
  unsubscribe,
  fetch,
  reader,
  upgrade,
];

const parseArgsOptions: ParseOptions = {
  boolean: ["help", "force", "quiet", "silent"],
  default: {
    limit: null,
  },
  alias: {
    help: "h",
    force: "f",
  },
};

/** Dispatches CLI arguments to the matching feeds command. */
export default async function main(
  args: string[],
  config: Configuration,
  store: FsStorage | KvStorage,
  paths: Paths,
): Promise<number | void> {
  const parsedArgs = parseArgs(args, parseArgsOptions);
  const { input, options } = handleArgs(parsedArgs);
  const feeds = await store.loadFeeds();
  const deps: Deps = {
    feeds,
    store,
    paths,
    config,
    args: parsedArgs,
  };

  const [command] = input;
  switch (command) {
    case "init":
      return await init.run(input, options, deps);
    case "list":
      return await list.run(input, options, deps, feeds, store);
    case "subscribe":
      return await subscribe.run(
        input,
        options,
        deps,
        parsedArgs,
        feeds,
        store,
      );
    case "unsubscribe":
      return await unsubscribe.run(
        input,
        options,
        deps,
        parsedArgs,
        feeds,
        store,
      );
    case "fetch":
      return await fetch.run(input, options, deps, feeds, store);
    case "reader":
      return await reader.run(
        input,
        options,
        deps,
        config,
        paths,
        parsedArgs,
        feeds,
        store,
      );
    case "upgrade":
      return await upgrade.run(input, options, deps);
    case "--help":
    case "-h":
    case undefined:
      return printHelp();
    default:
      throw new CommandError(`unknown command: ${command}`);
  }
}

const printHeader = () => `${colors.cyan(pkg.name)} - v${pkg.version}`;

function printHelp() {
  console.log(`
${printHeader()}

${colors.green("Description")}:
  Small CLI program for managing & consuming feeds of different kinds (RSS/Atom/JSON).

${colors.green("Usage")}:
  Run directly from JSR:
    $ deno -RWNE jsr:${pkg.name}/cli <command>

  When installed on system:
    $ feeds <command>

${colors.green("Commands")}:
  ${colors.yellow(init.name)}             - ${init.description}
  ${colors.yellow(list.name)}             - ${list.description}
  ${colors.yellow(subscribe.name)}        - ${subscribe.description}
  ${colors.yellow(unsubscribe.name)}      - ${unsubscribe.description}
  ${colors.yellow(fetch.name)}            - ${fetch.description}
  ${colors.yellow(reader.name)}           - ${reader.description}
  ${colors.yellow(upgrade.name)}          - ${upgrade.description}
  `);
  return 0;
}

function printCommandHelp(command: Command): number {
  console.log(`
${printHeader()}

${colors.green("Description")}:
  ${command.description}

${command.help}
  `);
  return 0;
}

async function bootstrap() {
  try {
    const paths = await resolvePaths();
    if (!paths) throw new Error("Failed to resolve paths!");
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

if (import.meta.main) {
  bootstrap();
}
