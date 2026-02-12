import type { FsStorageConfig, KvStorageConfig } from "./storage.ts";

export interface ConfigContract {
  storage: FsStorageConfig | KvStorageConfig;
}

export const defineConfig = (config: ConfigContract): ConfigContract => config;
