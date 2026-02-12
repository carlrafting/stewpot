import type { Paths } from "./cli.ts";
import type { ConfigContract } from "./config.ts";
import { type FeedData, type FeedItem, FilePersistence } from "./main.ts";

export type StorageType = { type: "source" } | { type: "items" };

export interface StorageContract {
  load(type: StorageType): Promise<FeedData[] | FeedItem[]>;
  save(type: StorageType): Promise<void>;
}

/** config type for filesystem (fs) storage */
export type FsStorageConfig = {
  type: "fs";
  path: string;
};

/** config type for kv storage */
export type KvStorageConfig = {
  type: "kv";
  path?: string;
};

export function createStorage(config: ConfigContract["storage"], paths: Paths) {
  switch (config.type) {
    case "fs":
      return new FilePersistence(paths.sources);
    case "kv":
      throw "Sorry! KV Storage not implemented yet.";
  }
}
