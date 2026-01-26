import { parseArgs } from "@std/cli";
import { assertEquals } from "@std/assert";
import * as path from "@std/path";
import * as colors from "@std/fmt/colors";

/*   
  console.log(`@stewpot/feeds is a package that provides utilities for consuming feeds of different kinds (RSS/Atom/JSON).\n`);

  prompt("Enter website or feed URL:");
 */

export class CommandError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1
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

function parseURL(input: string): URL | undefined {
  try {
    return new URL(input);
  } catch (_error) {
    console.error(colors.red("error"), "invalid URL format!");
  }
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
}

export const subscribeCommand = async (args: ParsedArguments, feeds: FeedFileSchema[], filePath: string) => {
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

  const response = await fetch(url);
  const body = response.body;
  const decoder = new TextDecoder('utf-8');
  if (!body) {
    console.error(colors.red("error"), "No response body present");
    return 1;
  }
  for await (const chunk of body) {
    console.log(decoder.decode(chunk));
  }

  return 0;
};

export const unsubscribeCommand = (args: ParsedArguments) => {
  return 0;
};

export type ParsedArguments = {
  [x: string]: unknown;
  _: Array<string | number>;
};

interface FeedFileSchema {
  title: string,
  url: string
}

const feedsFileName = "feeds.json";
const filePath = path.join(Deno.cwd(), feedsFileName);

let feeds: FeedFileSchema[];

export async function main(args: string[]): Promise<number> {
  const [command, ...rest] = args;
  const parsedArgs = parseArgs(rest);

  console.log({
    parsedArgs
  });

  try {
    const textFile = await Deno.readTextFile(filePath);
    feeds = JSON.parse(textFile);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      const answer = prompt(`${feedsFileName} doesn't exist at ${filePath}, would you like to create it? [yes|y]/[no|n]`, "yes");
      if (answer === "yes" || answer === "y") {
        await Deno.writeTextFile(filePath, "{}");
        console.log(`created ${feedsFileName} at ${filePath}!`);
        return 0;
      }
      return 1;
    }
    throw error;
  }

  switch (command) {
    case "list":
      return listCommand(parsedArgs, feeds);
    case "subscribe":
      return subscribeCommand(parsedArgs, feeds, filePath);
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
