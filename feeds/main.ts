import { parseArgs } from "@std/cli";
import { assertEquals } from "@std/assert";
import * as path from "@std/path";

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

export const listCommand = (args: ParsedArguments) => {
  console.log("1.  Example Feed");
  console.log("2.  Another Feed");
  return 0;
}

export const subscribeCommand = (args: ParsedArguments) => {
  return 0;
};

export default (args: ParsedArguments) => {
  return 0;
};

export type ParsedArguments = {
  [x: string]: any;
  _: Array<string | number>;
};

interface FeedFileSchema {
  title: string,
  url: string
}

const feedsFileName = "feeds.json";
const filePath = path.join(Deno.cwd(), feedsFileName);

export async function main(args: string[]): Promise<number> {
  const [command, ...rest] = args;
  const parsedArgs = parseArgs(rest);

  try {
    const textFile = await Deno.readTextFile(filePath);
    const feeds: FeedFileSchema[] = JSON.parse(textFile);
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
      return listCommand(parsedArgs);
    case "subscribe":
      return subscribeCommand(parsedArgs);
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
