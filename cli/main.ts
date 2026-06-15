import { join } from "@std/path/join";
import { ensureDir } from "@std/fs";
import { CONFIG_FILENAME, ITEMS_DIRNAME, KV_FILENAME, SOURCES_FILENAME } from "@stewpot/feeds/cli";

export type CLIDeps = {
  [key: string]: unknown
}

export interface CLIPaths {
  [key: string]: unknown | undefined
}

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
};

const ENV_CLI_DIR = "STEWPOT_CLI_ROOT";
const ROOT_DIRNAME = ".stewpot";
const PARENT_DIRNAME = ROOT_DIRNAME;

/**
 * the type returned by {@linkcode parseArgs}
 */
export type ParsedArguments = {
  [x: string]: unknown;
  _: Array<string | number>;
};

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

export async function resolvePaths<CLIPaths>(base?: string): Promise<CLIPaths | undefined> {
  const root = base ?? resolveRootDirectory();

  if (!root) return;

  await ensureDir(root);
  const config = join(root, CONFIG_FILENAME);
  const sources = join(root, SOURCES_FILENAME);
  const items = join(root, ITEMS_DIRNAME);
  const kv = join(root, KV_FILENAME);

  const results = {
    root,
    config,
    sources,
    items,
    kv,
  };

  return results as CLIPaths;
}

export function resolveRootDirectory(): string | undefined {
  const env = Deno.env;
  const parent = PARENT_DIRNAME;
  const root = ROOT_DIRNAME;

  const override = env.get(ENV_CLI_DIR);
  if (override) return override;

  const home = resolveUserHomeDirectory();
  if (home) {
    return join(home, parent, root);
  }
}

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
