import * as colors from "@std/fmt/colors";
import { ulid } from "@std/ulid";
import type { Paths } from "@stewpot/feeds/cli";
import { parseAtomFeed, parseRssFeed } from "feedsmith";

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
}

const parsers: Parser[] = [];

/** parsers should implement the following methods */
export interface Parser {
  capable(contentType: string, text: string): boolean;
  parse(text: string): FeedItem[];
}

/** parser responsible for detecting and parsing RSS */
export const rssParser: Parser = {
  capable(contentType, text) {
    return (contentType.includes("xml") && text.includes("<rss"));
  },
  parse(text) {
    const items: FeedItem[] = [];
    const parsed = parseRssFeed(text);
    if (!parsed.items) return items;
    for (const item of parsed.items) {
      items.push({
        id: item.guid?.value ?? ulid(),
        title: item.title ?? null,
        content: item?.content?.encoded ?? null,
        url: item?.link ?? null,
        published: item?.pubDate ? new Date(item?.pubDate) : null,
      });
    }
    return items;
  },
};

/** parser responsible for detecting and parsing Atom */
export const atomParser: Parser = {
  capable(contentType, text) {
    return (
      contentType?.includes("xml") && text.includes("<feed")
    );
  },
  parse(text) {
    const items: FeedItem[] = [];
    const parsed = parseAtomFeed(text);
    if (!parsed.entries) return items;
    for (const entry of parsed.entries) {
      items.push({
        id: entry?.id ?? ulid(),
        title: entry?.title ?? null,
        summary: entry?.summary ?? null,
        content: entry?.content ?? null,
        url: entry?.links?.[0].href ?? null,
        published: entry?.published ? new Date(entry.published) : null,
        updated: entry?.updated ? new Date(entry.updated) : null,
      });
    }
    return items;
  },
};

function detectParser(contentType: string, text: string) {
  for (const parser of parsers) {
    if (parser.capable(contentType, text)) {
      return parser;
    }
  }
  throw new Error("Unsupported feed format");
}

/** the shape a feed item will be stored as */
export interface FeedItem {
  /** unique identifier (guid, uid, ulid, url, href) */
  id: string;
  /** title of the feed item */
  title: string | null;
  /** url/link for feed item */
  url: string | null;
  /** which date the feed item was published at */
  published: Date | null;
  /** which date the feed item was updated at */
  updated?: Date | null;
  /** summary for feed item */
  summary?: string | null;
  /** content for feed item */
  content: string | null;
}

/**
 * the shape of results returned by `fetchFeedItemsFromURL`
 */
export interface FetchResults {
  /** if feed source `Response` was modified or not */
  status: "modified" | "not-modified";
  /** feed source response content-type header  */
  contentType: string | null;
  /** etag header for feed source response */
  etag: string | null;
  /** last-modified header for feed source response */
  lastModified: string | null;
  /** body for feed source response */
  body: string | null;
}

/**
 * class responsible for persisting feeds and items to filesystem
 */
export class FilePersistence {
  /** filepath for storing feed source metadata */
  public filePath: string;

  /**
   * takes instance of `Paths` and assigns `filePath` to `paths.sources`
   *
   * @param paths instance of `Paths`
   */
  constructor(paths: Paths) {
    this.filePath = paths.sources;
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
  async writeFile(): Promise<void> {
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
   * hello world
   *
   * @param feed feed source data to update
   */
  async updateFeed(feed: FeedData): Promise<void> {}

  /**
   * hello world
   *
   * @param feedID id string for feed source
   * @param items array of FeedItem to save/store
   */
  async saveItems(feedID: FeedData["id"], items: FeedItem[]): Promise<void> {
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

function createStorage(config: ConfigContract["storage"]) {
  switch (config.type) {
    case "fs":
      return;
    case "kv":
      return;
  }
}

/**
 * simple & dumb feed discovery function
 *
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
  let title = null;

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

  if (format === "rss" || format === "atom") {
    const text = await response.text();
    const match = text.match(/<title>(.*?)<\/title>/i);
    title = match?.[1].trim();
  }

  if (format === "json") {
    try {
      const json = await response.json();
      title = json.title;
    } catch {
      /* ignore */
    }
  }

  return {
    id,
    title,
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

  if (data.lastModified) {
    headers["if-modified-since"] = data.lastModified;
  }

  if (data.etag) {
    headers["if-none-match"] = data.etag;
  }

  const response = await fetch(url, { headers });

  if (response.status === 304) {
    return {
      status: "not-modified",
      contentType: response.headers.get("content-type"),
      etag: null,
      lastModified: null,
      body: null,
    };
  }

  if (!response.ok) {
    throw new Error(`failed to fetch feed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("xml") && !contentType.includes("json")) {
    throw new Error("resource does not appear to be a feed");
  }
  const etag = response.headers.get("etag");
  const lastModified = response.headers.get("last-modified");
  const body = await response.text();

  return {
    status: "modified",
    contentType,
    etag,
    lastModified,
    body,
  };
}

/**
 * fetch response body in chunks from a URL instance
 *
 * @param url URL instance to fecth response body chunks from
 */
export async function* fetchResponseBodyInChunksFromURL(
  url: URL,
): AsyncGenerator<string | undefined> {
  const response = await fetch(url);
  const body = response.body;
  const decoder = new TextDecoder("utf-8");
  if (!body) {
    console.error(colors.red("error"), "no response body was found");
    return;
  }
  for await (const chunk of body) {
    yield decoder.decode(chunk);
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
