import { parseArgs } from "@std/cli";
import { ensureDir } from "@std/fs";
import { join as joinPath } from "@std/path/join";
import * as colors from "@std/fmt/colors";
import {
  defineConfig,
  discoverFeed,
  type FeedData,
  fetchFeedItemsFromURL,
  fetchFeedMetadata,
  FilePersistence,
  parseInputToURL,
} from "./main.ts";
import denoJSON from "./deno.json" with { type: "json" };

const ENV_VAR = "STEWPOT_FEEDS_CLI_DIR";
const PARENT_DIR = ".stewpot";
const ROOT_DIR = "feeds";
const SOURCES_FILENAME = "feeds.json";
const ITEMS_FILENAME = "items.json";

/** paths used for file & kv storage */
export interface Paths {
  root: string;
  sources: string;
  config?: string;
  items?: string;
}

async function resolvePaths(): Promise<Paths | undefined> {
  const root = resolveRootDirectory();

  if (!root) return;

  await ensureDir(root);
  const sources = joinPath(root, SOURCES_FILENAME);

  return {
    root,
    sources,
  };
}

function resolveRootDirectory(): string | undefined {
  const env = Deno.env;
  const parent = PARENT_DIR;
  const root = ROOT_DIR;

  const override = env.get(ENV_VAR);
  if (override) return override;

  const home = resolveUserHomeDirectory();
  if (home) {
    return joinPath(home, parent, root);
  }
}

/** resolves a user home directory (linux, mac/darwin & windows) */
export function resolveUserHomeDirectory(): string {
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

export class CommandError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1,
  ) {
    super(message);
  }
}

class NotImplementedError extends Error {
  constructor(
    message: string = "Not Implemented!",
  ) {
    super(message);
  }
}

function help() {
  console.log(`
${colors.cyan("@stewpot/feeds")} - v${denoJSON.version}

${colors.green("Description")}:
  Small CLI program for managing & consuming feeds of different kinds (RSS/Atom/JSON).

${colors.green("Usage")}:
  deno -RWNE ${import.meta.url} <command>

${colors.green("Commands")}:
  ${colors.yellow("list")}          - list subscribed feed sources
  ${colors.yellow("subscribe")}     - subscribe to new feed source
  ${colors.yellow("unsubscribe")}   - delete feed source
  ${colors.yellow("fetch")}         - update feed source
  ${colors.yellow("read")}          - read feed source
  `);
  return 0;
}

export const listCommand = async (
  args: ParsedArguments,
  feeds: FeedData[],
  store: FilePersistence,
): Promise<number> => {
  if (feeds.length === 0) {
    console.error(colors.red("error"), "there are no feeds");
    return 1;
  }

  if (args?.update) {
    const updated: FeedData[] = [];
    for (const feed of feeds) {
      const url = new URL(feed.url);
      console.log(
        colors.cyan("info"),
        `fetching and updating feed source metadata for ${url.host}`,
      );
      const metadata = await fetchFeedMetadata(url);
      updated.push(metadata);
    }
    store.saveFeeds(updated);
    console.log(colors.green("done"), `saved changes to ${store.filePath}`);
    return 0;
  }

  for (const feed of feeds) {
    console.dir(feed);
  }

  return 0;
};

export const subscribeCommand = async (
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
      `subscribe to discovered feed for "${oldHref}" at "${url.href}"? [y/N]`,
    )?.toLocaleLowerCase();
    if (ok !== "y" && ok !== "yes") {
      url.href = oldHref;
      return 1;
    }
  }

  const feed = await fetchFeedMetadata(url);

  feeds.push(feed);
  await store.saveFeeds(feeds);

  console.log(colors.green("subscribed!"), feed.url);

  return 0;
};

export const unsubscribeCommand = async (
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
  const filtered = feeds.filter((item) =>
    new URL(item.url).hostname !== url?.hostname
  );
  if (filtered.length > 0) {
    await store.saveFeeds(filtered);
    console.log(colors.green("ok"), `unsubscribed to ${url?.href}`);
    return 0;
  }
  return 0;
};

export const fetchCommand = async (
  args: ParsedArguments,
  feeds: FeedData[],
  store: FilePersistence,
): Promise<number> => {
  if (feeds.length === 0) {
    console.error(colors.red("error"), "feeds empty, nothing to fetch");
    return 1;
  }

  for (const feed of feeds) {
    const { url } = feed;
    try {
      const results = await fetchFeedItemsFromURL(new URL(url), feed);

      if (results.status === "not-modified") {
        console.log("houston, we have a problem");
        continue;
      }

      if (
        results.body &&
        results.contentType?.includes("json")
      ) {
        const json = JSON.parse(results.body);
        console.log({ json });
      }
    } catch (_error) {
      console.error(
        colors.red("error"),
        `something went wrong while fetching items from ${url}`,
      );
      return 1;
    }
  }

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

export type ParsedArguments = {
  [x: string]: unknown;
  _: Array<string | number>;
};

export async function main(
  args: string[],
  store: FilePersistence,
): Promise<number> {
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
    case "read":
      return notImplementedCommand();
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
    const store = new FilePersistence(paths);
    const code = await main(Deno.args, store);
    Deno.exit(code);
  } catch (error) {
    if (error instanceof CommandError) {
      console.error(colors.red("error"), error.message);
      Deno.exit(error.exitCode);
    }
    throw error;
  }
}
