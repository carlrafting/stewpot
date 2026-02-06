import { parseArgs } from "@std/cli";
import * as colors from "@std/fmt/colors";
import { ulid } from "@std/ulid/ulid";
import {
  discoverFeed,
  type FeedData,
  type FeedFormat,
  type FeedID,
  fetchFeedItemsFromURL,
  FilePersistence,
  parseInputToURL,
} from "./main.ts";
import denoJSON from "./deno.json" with { type: "json" };

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
  deno -RWN @stewpot/feeds/cli <command>

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

  if (args?.update) {
    /* TODO: update feed source metadata... */
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

  let format: FeedFormat = "unknown";
  let title = null;

  const response = await fetch(url);
  const headers = response.headers;
  const text = await response.text();

  const match = text.match(/<title>(.*?)<\/title>/i);

  if (match && match[1]) {
    title = match[1].trim();
  }

  const contentType = headers.get("content-type");

  if (contentType?.includes("rss")) {
    format = "rss";
  }
  if (contentType?.includes("atom")) {
    format = "atom";
  }
  if (contentType?.includes("json")) {
    format = "json";
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
    format,
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
) => {
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
