import { parseArgs } from "@std/cli";
import { assertEquals } from "@std/assert";
import * as path from "@std/path";
import * as colors from "@std/fmt/colors";
import { parseURL } from "./main.ts";

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
        console.log(colors.green(`Created new feeds file at ${this.filePath}`));
      } else {
        throw error;
      }
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
    console.error(colors.red("error"), "No response body present");
    return;
  }
  for await (const chunk of body) {
    yield decoder.decode(chunk);
  }
}

/*
  console.log(`@stewpot/feeds is a package that provides utilities for consuming feeds of different kinds (RSS/Atom/JSON).\n`);

  prompt("Enter website or feed URL:");
 */

export class CommandError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1,
  ) {
    super(message);
  }
}

function help() {
  console.log(`
    @stewpot/feeds is a package that provides utilities for consuming feeds of different kinds (RSS/Atom/JSON).

    Usage:
      @stewpot/feeds <command>
    
    Commands:
      list          - list added feeds
      subscribe     - subscribe to new feeds
      unsubscribe   - delete feed
      fetch         - update feeds
      read          - read feeds
  `);
  return 0;
}

export const listCommand = (args: ParsedArguments, feeds: FeedFileSchema[]) => {
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
) => {
  const [input] = args._;

  if (typeof input !== "string") {
    console.error(colors.red("error"), "subscribe: invalid input format!");
    return 1;
  }

  const url = parseURL(input);

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
      colors.red("warning"),
      "Failed to fetch feed title, using URL as fallback title",
    );
  }

  const newFeed: FeedFileSchema = {
    title,
    url: url.href,
  };

  feeds.push(newFeed);
  await store.saveFeeds(feeds);

  console.log(colors.green("Subscribed!"), newFeed.url);

  return 0;
};

export const unsubscribeCommand = (args: ParsedArguments) => {
  return 0;
};

export type ParsedArguments = {
  [x: string]: unknown;
  _: Array<string | number>;
};

export interface FeedFileSchema {
  title: string | null;
  url: string;
}

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
    case "fetch":
    case "read":
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
