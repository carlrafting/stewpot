import { dirname } from "@std/path/dirname";
import { join } from "@std/path/join";
import { ensureFile } from "@std/fs/ensure-file";
import * as colors from "@std/fmt/colors";
import { ITEMS_DIRNAME } from "./cli.ts";
import type { Paths } from "./cli.ts";
import type { Configuration } from "./config.ts";
import type { FeedData, FeedID, FeedItem } from "./main.ts";

export interface Storage {
  loadFeeds(): Promise<FeedData[]>;
  saveFeeds(feeds: FeedData[]): Promise<void>;
  loadItems(id: FeedID): Promise<FeedItem[]>;
  saveItems(
    feedID: FeedData["id"],
    items: FeedItem[],
    feeds: FeedData[],
  ): Promise<void>;
  removeItems(id: FeedID): Promise<void>;
}

/**
 * class responsible for persisting feeds and items to filesystem
 */
export class FsStorage implements Storage {
  /** filepath for storing feed source metadata */
  public filePath: string;

  /**
   * takes instance of {@linkcode Paths} and assigns `paths.sources` to `filePath`
   *
   * @param paths instance of `Paths`
   */
  constructor(sourcesPath: Paths["sources"]) {
    this.filePath = sourcesPath;
  }

  /** ensure that the file exists and has valid JSON content */
  async ensureFile(): Promise<boolean | undefined> {
    try {
      const file = await Deno.readTextFile(this.filePath);
      if (file === "") {
        this.writeFile();
      }
      return true;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        this.writeFile();
        return true;
      }
      throw error;
    }
  }

  /** writes empty JSON array to filePath and logs a message */
  private async writeFile(): Promise<void> {
    await Deno.writeTextFile(this.filePath, "[]");
    console.log(
      colors.green("OK!"),
      `created new feeds file at ${this.filePath}`,
    );
  }

  /** load feed sources and returns them */
  async loadFeeds(): Promise<FeedData[]> {
    await this.ensureFile();

    try {
      const text = await Deno.readTextFile(this.filePath);
      if (text === "") throw new Error("file contents is not valid JSON");
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        throw new Error("feeds.json is not an array");
      }

      return data;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return [];
      }

      console.error(colors.red("error"), "failed to load feeds");
      throw error;
    }
  }

  /** stringifies array of `FeedData` and writes to `filePath` */
  async saveFeeds(feeds: FeedData[]): Promise<void> {
    const text = JSON.stringify(feeds, null, 2);
    await Deno.writeTextFile(this.filePath, text);
  }

  /**
   * update feed source metadata
   *
   * @param feed feed source data to update
   */
  async updateFeed(feed: FeedData, feeds: FeedData[]): Promise<void> {
    const index: number = feeds.findIndex((f) => f.id === feed.id);
    if (index === -1) {
      throw new Error(`feed not found: ${feed.id}`);
    }
    feeds[index] = feed;
  }

  /**
   * save feed items
   *
   * @param feedID id string for feed source
   * @param items array of FeedItem to save/store
   */
  async saveItems(
    feedID: FeedData["id"],
    items: FeedItem[],
    feeds: FeedData[],
  ): Promise<void> {
    const feed = feeds.find((f) => f.id === feedID);
    if (!feed) {
      throw new Error(`feed not found: ${feedID}`);
    }
    const text = JSON.stringify(items, null, 2);
    const root = dirname(this.filePath);
    const path = join(root, ITEMS_DIRNAME, `${feed.id}.json`);
    await ensureFile(path);
    await Deno.writeTextFile(path, text, { create: true });
  }

  /**
   * Load items for feed source by id
   *
   * @param id feed source id {@linkcode FeedData["id"]}
   */
  async loadItems(id: FeedID): Promise<FeedItem[]> {
    const root = dirname(this.filePath);
    const path = join(root, ITEMS_DIRNAME, `${id}.json`);
    try {
      const file = await Deno.readTextFile(path);
      const parsedJSON = JSON.parse(file);
      const items: FeedItem[] = parsedJSON;
      return items;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove items for feed source by id
   *
   * @param id feed source id
   */
  async removeItems(id: FeedID): Promise<void> {
    const recursive = true;
    const root = dirname(this.filePath);
    const path = join(root, ITEMS_DIRNAME, `${id}.json`);
    try {
      await Deno.remove(path, { recursive });
    } catch (error) {
      console.error({ error });
    }
  }
}

export class KvStorage implements Storage {
  constructor(private kv: Deno.Kv) {}

  async loadFeeds(): Promise<FeedData[]> {
    const data = await this.kv.get<FeedData[]>(["feeds"]);
    return data.value ?? [];
  }

  async saveFeeds(feeds: FeedData[]): Promise<void> {
    await this.kv.set(["feeds"], feeds);
  }

  async loadItems(id: FeedID): Promise<FeedItem[]> {
    const kv = this.kv;
    const data = await kv.get<FeedItem[]>(["items", id]);
    return data.value ?? [];
  }

  async saveItems(
    feedID: FeedData["id"],
    items: FeedItem[],
    feeds: FeedData[],
  ): Promise<void> {
    const kv = this.kv;
    await kv.set(["items", feedID], items);
  }

  async removeItems(id: FeedID): Promise<void> {
    await this.kv.delete(["items", id]);
  }
}

export async function createStorage(
  config: Configuration["storage"],
  paths: Paths,
): Promise<FsStorage | KvStorage> {
  if (!config?.type) {
    throw new Error("storage config type must be either kv or fs");
  }
  if (config.type === "kv") {
    const kv = await Deno.openKv(paths.kv);
    return new KvStorage(kv);
  }
  return new FsStorage(paths.sources);
}
