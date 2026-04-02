import { toFileUrl } from "@std/path/to-file-url";
import type { Paths } from "./cli.ts";
import * as colors from "@std/fmt/colors";

/** config type for filesystem (fs) storage */
export type FsStorageConfig = {
  type: "fs";
};

/** config type for kv storage */
export type KvStorageConfig = {
  type: "kv";
};

/** configure various aspects of CLI */
export interface Configuration {
  /** what kind of storage type should be used */
  storage?: FsStorageConfig | KvStorageConfig;
  /** reader config */
  reader?: {
    /** server hostname */
    hostname?: string;
    /** what port the server should listen to */
    port?: number;
  };
}

/**
 * pass configuration to @stewpot/feeds
 *
 * @param config object that should implement the ConfigContract interface
 * @returns the config
 */
export const defineConfig = (config: Configuration): Configuration => config;

/**
 * Loads the config exists at given path and returns file content
 *
 * @param path path to config file
 * @returns contents of the config file
 * @throws `Deno.errors.NotFound` if file doesn't exists
 */
export async function loadConfig(
  path: Paths["config"],
): Promise<Configuration> {
  const config = path;

  if (!config) {
    console.log(colors.cyan("info"), "using default configuration");
    const configUrl = new URL("./assets/config.default.ts", import.meta.url);
    const defaultConfig = await import(configUrl.href);
    return defaultConfig.default;
  }

  console.log(colors.cyan("info"), `loading config at ${config}`);
  const configModule = await import(toFileUrl(config).href);
  return configModule.default;
}

/**
 * takes a path string and write config file to that path
 *
 * @param path to write config file to
 */
export async function writeConfigToPath(path: string) {
  const fileUrl = new URL("./assets/config.default.ts", import.meta.url);
  const response = await fetch(fileUrl);
  const textFile = await response.text();
  await Deno.writeTextFile(path, textFile);
}
