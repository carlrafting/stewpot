import { parseArgs } from "@std/cli";
import { assertEquals } from "@std/assert";
import * as path from "@std/path";
import * as colors from "@std/fmt/colors";
import { parseSubscribeInputToURL } from "./main.ts";
import denoJSON from "./deno.json" with { type: "json" };

export class FilePersistence {
  private filePath: string;

  constructor(filename = "feeds.json") {
    this.filePath = path.join(Deno.cwd(), filename);
  }

  async ensureFile(): Promise<boolean | undefined> {
    try {
      const fileInfo = await Deno.stat(this.filePath);
      return fileInfo.isFile;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        await Deno.writeTextFile(this.filePath, "[]");
        console.log(colors.green("OK!"), `created new feeds file at ${this.filePath}`);
      }
      throw error;
    }
  }

  async loadFeeds(): Promise<FeedFileSchema[]> {
    await this.ensureFile();

    try {
      const text = await Deno.readTextFile(this.filePath);
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        throw new Error("feeds.json is not an array");
      }

      return data;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return [];
      }

      console.error(colors.red("error"), "failed to load feeds");
      throw error;
    }
  }

  async saveFeeds(feeds: FeedFileSchema[]): Promise<void> {
    const text = JSON.stringify(feeds, null, 2);
    await Deno.writeTextFile(this.filePath, text);
  }
}

async function* fetchResponseBodyInChunksFromURL(url: URL) {
  const response = await fetch(url);
  const body = response.body;
  const decoder = new TextDecoder("utf-8");
  if (!body) {
    console.error(colors.red("error"), "no response body was found");
    return;
  }
  for await (const chunk of body) {
    yield decoder.decode(chunk);
  }
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
    message: string = "Not Implemented!"
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
  feeds: FeedFileSchema[],
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
  feeds: FeedFileSchema[],
  store: FilePersistence,
): Promise<number> => {
  const [input] = args._;

  if (typeof input !== "string") {
    console.error(colors.red("error"), "invalid input format!");
    return 1;
  }

  const url = parseSubscribeInputToURL(input);

  if (!url) {
    return 1;
  }

  const exists = feeds.filter((value) => value.url === url?.href);

  if (exists.length > 0) {
    console.error(colors.red("error"), "URL already exists!");
    return 1;
  }

  let title: string | null = null;

  try {
    const response = await fetch(url);
    const text = await response.text();

    const match = text.match(/<title>(.*?)<\/title>/i);
    if (match && match[1]) {
      title = match[1].trim();
    }
  } catch (_error) {
    console.error(
      colors.yellow("warning"),
      "failed to fetch feed title, using URL as fallback for title",
    );
  }

  const newFeed: FeedFileSchema = {
    title,
    url: url.href,
  };

  feeds.push(newFeed);
  await store.saveFeeds(feeds);

  console.log(colors.green("subscribed!"), newFeed.url);

  return 0;
};

export const unsubscribeCommand = (args: ParsedArguments): number => {
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
}

export type ParsedArguments = {
  [x: string]: unknown;
  _: Array<string | number>;
};

export interface FeedFileSchema {
  title: string | null;
  url: string;
}

export function discoverFeeds() { }

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
      return notImplementedCommand();
    case "fetch":
      return notImplementedCommand();
    case "read":
      return notImplementedCommand();
    case "--help":
    case "-h":
    case undefined:
      return help();
    default:
      help();
      throw new CommandError(`Unknown command: ${command}`);
  }
}

if (import.meta.main) {
  try {
    const code = await main(Deno.args);
    Deno.exit(code);
  } catch (error) {
    if (error instanceof CommandError) {
      console.error(error.message);
      Deno.exit(error.exitCode);
    }
    throw error;
  }
}
