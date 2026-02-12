import * as colors from "@std/fmt/colors";
import { ulid } from "@std/ulid";
import type { Paths } from "./cli.ts";
import { parseAtomFeed, parseJsonFeed, parseRssFeed } from "feedsmith";
import type { Atom, DeepPartial, Json, Rdf, Rss } from "feedsmith/types";
import { dirname } from "@std/path/dirname";
import { join } from "@std/path/join";
import { ensureFile } from "@std/fs/ensure-file";

/**
 * This is the main module. It handles everything related to feeds.
 * @module
 */

/** unique identifier for feed source (ulid) */
export type FeedID = string;

/** content-type from response header */
export type FeedContentType =
  | "application/xml"
  | "application/json"
  | "application/atom+xml"
  | "application/rss+xml"
  | "application/feed+json"
  | "text/xml"
  | "text/json";

/** what format the feed uses, unknown if it can't be determined  */
export type FeedFormat = "rss" | "atom" | "json" | "unknown";

/**
 * feed source data eg. website
 */
export interface FeedData {
  /** unique identifier in form of ulid */
  id: FeedID;
  /** url to feed */
  url: string;
  /** feed source format */
  format: FeedFormat;
  /** feed source title */
  title?: string | null;
  /** reponse header etag (optional) */
  etag?: string | null;
  /** reponse header last-modified header (optional) */
  lastModified?: string | null;
  /** response body */
  body?: string | null;
}

/** the shape a feed item will be stored as */
export interface FeedItem {
  /** unique identifier (guid, uid, ulid, url, href) */
  id: string;
  /** foreign key */
  feed: FeedID;
  /** title of the feed item */
  title: string | null;
  /** url/link for feed item */
  url: string | undefined;
  /** which date the feed item was published at */
  published?: string;
  /** which date the feed item was updated at */
  updated?: string | null;
  /** summary for feed item */
  summary?: string | null;
  /** content for feed item */
  content: string | null;
}

/**
 * the shape of results returned by `fetchFeedItemsFromURL`
 */
export interface FetchResults extends FeedData {
  /** if feed source `Response` was modified or not */
  fetch: {
    status: "modified" | "not-modified";
    contentType: string | null;
  };
}

/**
 * This function takes parsed feed, content from response, metadata from headers, url and returns array of `FeedItems`
 *
 * @param parsed parsed feed by feedsmith
 * @param content response body content
 * @param metadata FeedData
 * @param url feed source URL instance
 */
export function mapToFeedItems(
  parsed:
    | { format: "rss"; feed: DeepPartial<Rss.Feed<string>> }
    | { format: "atom"; feed: DeepPartial<Atom.Feed<string>> }
    | { format: "rdf"; feed: DeepPartial<Rdf.Feed<string>> }
    | { format: "json"; feed: DeepPartial<Json.Feed<string>> },
  content: string,
  metadata: FeedData,
  url: URL,
): FeedItem[] {
  const items: FeedItem[] = [];
  const format = parsed.format;

  if (format === "rss") {
    const rss = parseRssFeed(content);
    if (rss?.items) {
      for (const item of rss.items) {
        items.push({
          id: item.guid?.value ?? ulid(),
          feed: metadata.id,
          title: item.title ?? null,
          content: item.description ?? null,
          url: item?.link,
          published: item?.pubDate,
        });
      }
    }
  }

  if (format === "atom") {
    const atom = parseAtomFeed(content);
    if (atom?.entries) {
      for (const entry of atom.entries) {
        items.push({
          id: entry?.id ?? ulid(),
          feed: metadata.id,
          title: entry?.title ?? null,
          summary: entry?.summary ?? null,
          content: entry?.content ?? null,
          url: entry?.links?.[0].href,
          published: entry?.published,
          updated: entry?.updated,
        });
      }
    }
  }

  if (format === "json") {
    const json = parseJsonFeed(content);
    if (json?.items) {
      for (const item of json.items) {
        items.push({
          id: item?.id ?? ulid(),
          feed: metadata.id,
          title: item?.title ?? "",
          url: url.href,
          content: item?.content_text ?? item?.content_html ?? null,
          published: item?.date_published,
        });
      }
    }
  }

  return items;
}

/**
 * class responsible for persisting feeds and items to filesystem
 */
export class FilePersistence {
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
    const path = join(root, "items", `${feed.id}.json`);
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
    const path = join(root, "items", `${id}.json`);
    let items: FeedItem[] = [];
    try {
      const file = await Deno.readTextFile(path);
      const parsed = JSON.parse(file);
      items = parsed.items;
    } catch (error) {
      throw error;
    }
    return items;
  }

  /**
   * Remove items for feed source by id
   *
   * @param id feed source id
   */
  async removeItems(id: FeedID): Promise<void> {
    const recursive = true;
    const root = dirname(this.filePath);
    const path = join(root, "items", `${id}.json`);
    try {
      await Deno.remove(path, { recursive });
    } catch (error) {
      console.error({ error });
    }
  }
}

type StorageType = { type: "source" } | { type: "items" };

interface StorageContract {
  load(type: StorageType): Promise<FeedData[] | FeedItem[]>;
  save(type: StorageType): Promise<void>;
}

/** config type for filesystem (fs) storage */
type FsStorageConfig = {
  type: "fs";
  path: string;
};

/** config type for kv storage */
type KvStorageConfig = {
  type: "kv";
  path?: string;
};

interface ConfigContract {
  storage: FsStorageConfig | KvStorageConfig;
}

const defineConfig = (config: ConfigContract): ConfigContract => config;

function createStorage(config: ConfigContract["storage"], paths: Paths) {
  switch (config.type) {
    case "fs":
      return new FilePersistence(paths.sources);
    case "kv":
      throw "Sorry! KV Storage not implemented yet.";
  }
}

/**
 * simple & dumb feed discovery function
 *
 * @example
 * ```ts
 * const results = await discoverFeeds("https://example.com")
 * ```
 *
 * @param url to website to discover feed links on
 */
export async function discoverFeed(url: string): Promise<string | undefined> {
  const commonPaths = [
    "/feed",
    "/rss",
    "/atom",
    "/feed.xml",
    "/rss.xml",
    "/atom.xml",
    "/feed.rss",
    "/feed.atom",
    "/feed.json",
    "/feed/index.xml",
  ];

  for (const path of commonPaths) {
    try {
      const candidate = new URL(path, url).href;
      const response = await fetch(candidate, { method: "HEAD" });
      if (response.ok) return candidate;
    } catch (error) {
      if (Error.isError(error)) {
        console.log(colors.red("error"), error.message);
      }
      throw error;
    }
  }
}

/** NOTE: this is a bit too optimistic */
function detectFeedFormatFromContentType(
  contentType: string,
): FeedFormat {
  if (contentType?.includes("rss")) {
    return "rss";
  }
  if (contentType?.includes("atom")) {
    return "atom";
  }
  if (contentType?.includes("json")) {
    return "json";
  }
  return "unknown";
}

/**
 * fetch metadata for feed source
 *
 * @param url URL instance to fetch metadata from
 */
export async function fetchFeedMetadata(url: URL): Promise<FeedData> {
  const id: FeedID = ulid();
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`failed to fetch feed from ${url.href}`);
  }

  const headers = response.headers;
  const lastModified = headers.get("last-modified");
  const etag = headers.get("etag");
  const contentType = headers.get("content-type") ?? "";

  const format: FeedFormat = detectFeedFormatFromContentType(contentType);

  return {
    id,
    url: url.href,
    etag,
    lastModified,
    format,
  };
}

/**
 * function responsible for fetching feed items from a URL instance
 *
 * @param url URL object for use with fetch request
 * @param data feed metadata from stored data (kv/file)
 */
export async function fetchFeedItemsFromURL(
  url: URL,
  data: FeedData,
): Promise<FetchResults> {
  const headers: HeadersInit = {};
  const id = data.id;

  if (data.lastModified) {
    headers["if-modified-since"] = data.lastModified;
  }

  if (data.etag) {
    headers["if-none-match"] = data.etag;
  }

  const response = await fetch(url);

  // if response has not been modified, return previous values
  /* {
    const contentType = response.headers.get("content-type");
    const etag = data.etag;
    const lastModified = data.lastModified;
    const body = data.body;
    const url = data.url;
    const format = data.format;

    if (response.status === 304) {
      return {
        id,
        url,
        format,
        contentType,
        etag,
        lastModified,
        body,
        fetch: {
          status: "not-modified",
        },
      };
    }
  } */

  /* if (!response.ok) {
    throw new Error(`failed to fetch feed: ${response.status}`);
  } */

  const contentType = response.headers.get("content-type") ?? "";
  // console.log({ contentType });
  // if (!contentType.includes("xml") && !contentType.includes("json")) {
  //   throw new Error("resource does not appear to be a feed");
  // }
  const format = detectFeedFormatFromContentType(contentType);
  const etag = response.headers.get("etag");
  const lastModified = response.headers.get("last-modified");
  const body = await response.text();

  console.log({ body });

  return {
    id,
    url: url.href,
    format,
    etag,
    lastModified,
    body,
    fetch: {
      contentType,
      status: "modified",
    },
  };
}

/**
 * fetch response body in chunks from a URL instance
 *
 * @param url URL instance to fecth response body chunks from
 */
export async function* fetchResponseBodyInChunksFromURL(
  url: URL,
): AsyncGenerator<string> {
  const response = await fetch(url);
  const body = response.body;
  const decoder = new TextDecoder("utf-8");
  if (!body) {
    throw new Error("response does not have a body");
  }
  for await (const chunk of body) {
    yield decoder.decode(chunk, { stream: true });
  }
}

/**
 * parse input string and return URL instance
 *
 * @param input url string input
 */
export function parseInputToURL(input: string): URL | undefined {
  if (!input.startsWith("http://") && !input.startsWith("https://")) {
    input = `https://${input}`;
  }
  try {
    return new URL(input);
  } catch (_error) {
    console.error(colors.red("error"), "invalid URL format!");
  }
}
