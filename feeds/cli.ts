import { parseArgs } from "@std/cli";
import * as colors from "@std/fmt/colors";
import {
  discoverFeed,
  type FeedData,
  FeedID,
  fetchFeedItemsFromURL,
  FilePersistence,
  parseInputToURL,
} from "./main.ts";
import denoJSON from "./deno.json" with { type: "json" };
import { ulid } from "@std/ulid/ulid";

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
  deno run -RWN @stewpot/feeds/cli <command>

${colors.green("Commands")}:
  ${colors.yellow("list")}          - list subscribed feed sources
  ${colors.yellow("subscribe")}     - subscribe to new feed source
  ${colors.yellow("unsubscribe")}   - delete feed source
  ${colors.yellow("fetch")}         - update feed source
  ${colors.yellow("read")}          - read feed source
  `);
  return 0;
}

export const listCommand = (
  args: ParsedArguments,
  feeds: FeedData[],
): number => {
  if (feeds.length === 0) {
    console.error(colors.red("error"), "there are no feeds");
    return 1;
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

  let title: string | null = null;

  const response = await fetch(url);
  const headers = response.headers;
  const text = await response.text();

  const match = text.match(/<title>(.*?)<\/title>/i);
  if (match && match[1]) {
    title = match[1].trim();
  }

  const lastModified = headers.get("last-modified");
  const etag = headers.get("etag");
  const id: FeedID = ulid();
  const newFeed: FeedData = {
    id,
    title,
    url: url.href,
    etag,
    lastModified,
  };

  feeds.push(newFeed);
  await store.saveFeeds(feeds);

  console.log(colors.green("subscribed!"), newFeed.url);

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
  const filtered = feeds.filter((item) => item.url !== url?.href);
  if (filtered.length > 0) {
    await store.saveFeeds(filtered);
    console.log(colors.green("ok"), `unsubscribed to ${url?.href}`);
    return 0;
  }
  return 0;
};

const fetchCommand = async (
  args: ParsedArguments,
  feeds: FeedData[],
  store: FilePersistence,
) => {
  if (feeds.length > 0) {
    for (const feed of feeds) {
      const { url, etag, lastModified } = feed;
      const id = feed?.id ?? null;
      const response = await fetchFeedItemsFromURL(new URL(url));
    }
    return 0;
  }
  console.error(colors.red("error"), "feeds empty, nothing to fetch");
  return 1;
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

export async function main(args: string[]): Promise<number> {
  const [command, ...rest] = args;
  const parsedArgs = parseArgs(rest);

  const store = new FilePersistence();
  const feeds = await store.loadFeeds();

  switch (command) {
    case "list":
      return listCommand(parsedArgs, feeds);
    case "subscribe":
      return await subscribeCommand(parsedArgs, feeds, store);
    case "unsubscribe":
      return unsubscribeCommand(parsedArgs, feeds, store);
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
    const code = await main(Deno.args);
    Deno.exit(code);
  } catch (error) {
    if (error instanceof CommandError) {
      console.error(colors.red("error"), error.message);
      Deno.exit(error.exitCode);
    }
    throw error;
  }
}
