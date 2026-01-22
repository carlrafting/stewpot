import * as cli from "@std/cli";
import { assertEquals } from "@std/assert";
import list from "./commands/list.ts";

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
    Usage:
      feeds list
    
    Commands:
      feeds - manage feeds
  `);
}

export function main(args: string[]) {
  const [command] = args;

  switch (command) {
    case "list":
      return list();
    case "add":
    case "update":
    case "delete":
    case "--help":
    case "-h":
    case undefined:
      help();
      return 0;
    default:
      help();
      throw new CommandError(`Unknown command: ${command}`);
  }
}

if (import.meta.main) {
  try {
    const code = main(Deno.args);
    Deno.exit(code);
  } catch (error) {
    if (error instanceof CommandError) {
      console.error(error.message);
      Deno.exit(error.exitCode);
    }
    throw error;
  }
}
