import { join } from "@std/path/join";

export type CLIDeps = {
  [key: string]: unknown;
};

/** input as array of strings */
export type Input = readonly string[];
/** options that are returned by {@linkcode parseArgs} and {@linkcode handleArgs} */
export type Options = { [x: string]: unknown };
/** a combined type with convinient access to both input and options */
export type InputWithOptions = { input: Input; options: Options };

/**
 * The type that represents a CLI Command
 */
export interface Command<CommandOptions = Options | unknown> {
  /** what name should the command have */
  name: string;
  /** a helpful description of what the command does */
  description: string;
  /** more in-depth help instructions for command */
  help?: string;
  /** method that invokes the command */
  run(
    input: Input,
    options: CommandOptions,
    deps: CLIDeps,
    ...rest: unknown[]
  ): Promise<number | void>;
}

/**
 * the type returned by {@linkcode parseArgs}
 */
export type ParsedArguments = {
  [x: string]: unknown;
  _: Array<string | number>;
};

/**
 * handle CLI arguments parsed by `parseArgs`
 *
 * @param args arguments as array of strings
 * @returns object represented by input and options
 */
export const handleArgs = (
  args: ParsedArguments,
): InputWithOptions => {
  const { _, ...options } = args;
  const input = _ as string[];
  return {
    input,
    options,
  };
};

/**
 * run/spawn subcommands
 *
 * @param args
 * @param file
 * @param options
 * @returns
 */
export function run(
  args: string[],
  file: string | null,
  options: Deno.CommandOptions = {},
): Deno.Command {
  if (!file) file = "cli.ts";
  return new Deno.Command(Deno.execPath(), {
    args: ["-P", import.meta.filename ?? file, ...args],
    ...options,
  });
}

/** override directory with environment variable (absolute path) */
const ENV_CLI_OVERRIDE = "STEWPOT_DIR_OVERRIDE";
/** stewpot root directory name */
const STEWPOT_DIRNAME = ".stewpot";
const STEWPOT_SUBDIRNAME = (to: string) => `STEWPOT_${to.toUpperCase()}_MODE`;

/**
 * resolves path to directory based on os environment
 *
 * @returns {string} the resolved root path as string
 */
export function resolvePath(to: string): string | undefined {
  const env = Deno.env;
  const root = STEWPOT_DIRNAME;
  const mode = env.get(STEWPOT_SUBDIRNAME(to)) ?? "production";

  const override = env.get(ENV_CLI_OVERRIDE);
  if (override) return override;

  if (mode && mode === "development") {
    const cwd = Deno.cwd();
    return join(cwd, root, to);
  }

  const home = resolveUserHomeDirectory();
  if (home) {
    return join(home, root, to);
  }
}

/**
 * determines user home directory by os environment
 *
 * @returns path to user home directory
 */
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
