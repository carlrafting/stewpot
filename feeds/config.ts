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

export interface Configuration {
  storage?: FsStorageConfig | KvStorageConfig;
  reader?: {
    port?: 8000;
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
  try {
    const config = path;
    if (config) {
      console.log(colors.cyan("info"), `loading config at ${config}`);
      const configModule = await import(config);
      return configModule;
    }
  } catch {
    // if (error instanceof Deno.errors.NotFound) {}
    console.error(colors.red("error"), `no config found at ${path}`);
  }
  console.log(colors.cyan("info"), "using default configuration");
  const configUrl = new URL("./assets/config.default.ts", import.meta.url);
  const defaultConfig = await import(configUrl.href);
  return defaultConfig.default;
}

async function _writeConfigToPath(path: string) {
  const fileUrl = new URL("./assets/config.default.ts", import.meta.url);
  const response = await fetch(fileUrl);
  const textFile = await response.text();
  await Deno.writeTextFile(path, textFile);
  console.log(colors.cyan("info"), `wrote config file to ${path}`);
}
