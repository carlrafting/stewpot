import { yellow } from "@std/fmt/colors";
import { isAbsolute } from "@std/path/is-absolute";
import { join } from "@std/path/join";
import { relative } from "@std/path/relative";

/** Base dependencies shared by CLI commands. */
export type CLIDeps = {
  [key: string]: unknown;
};

/** Positional CLI arguments. */
export type Input = readonly string[];

/** Named CLI options. */
export type Options = { [key: string]: unknown };

/** A parsed argument object returned by `parseArgs`. */
export type ParsedArguments = {
  [key: string]: unknown;
  _: Array<string | number>;
};

/** A command available to the feeds CLI. */
export interface Command<CommandOptions = Options | unknown> {
  /** Command name. */
  name: string;
  /** Short command description. */
  description: string;
  /** Detailed command usage. */
  help?: string;
  /** Executes the command. */
  run(
    input: Input,
    options: CommandOptions,
    deps: CLIDeps,
    ...rest: unknown[]
  ): Promise<number | void>;
}

/** Splits parsed CLI arguments into positional input and named options. */
export function handleArgs(
  args: ParsedArguments,
): { input: Input; options: Options } {
  const { _, ...options } = args;
  return {
    input: _ as string[],
    options,
  };
}

const ENV_OVERRIDE = "STEWPOT_DIR_OVERRIDE";
const ENV_MODE = "STEWPOT_MODE";
const STEWPOT_DIRNAME = ".stewpot";

/** Resolves the directory used for persistent Stewpot package data. */
export function resolvePath(to: string): string | undefined {
  const override = Deno.env.get(ENV_OVERRIDE);
  if (override) return override;

  if (detectMode() === "development") {
    return join(Deno.cwd(), "tmp", to);
  }

  if (!Deno.env.get(ENV_MODE)) {
    console.error(
      yellow("warn"),
      `${ENV_MODE} not set & no local checkout detected. use production directory.`,
    );
  }

  const home = resolveUserHomeDirectory();
  return join(home, STEWPOT_DIRNAME, to);
}

function detectMode(): "development" | "production" {
  const explicit = Deno.env.get(ENV_MODE);
  if (explicit === "production" || explicit === "development") {
    return explicit;
  }

  try {
    const relativePath = relative(
      Deno.cwd(),
      new URL(Deno.mainModule).pathname,
    );
    return !relativePath.startsWith("..") && !isAbsolute(relativePath)
      ? "development"
      : "production";
  } catch {
    return "development";
  }
}

function resolveUserHomeDirectory(): string {
  const os = Deno.build.os;
  if (os === "windows") {
    const home = Deno.env.get("USERPROFILE");
    if (home) return home;
  }
  if (os === "linux" || os === "darwin") {
    const home = Deno.env.get("HOME");
    if (home) return home;
  }
  throw new Error("unable to resolve user home directory");
}
