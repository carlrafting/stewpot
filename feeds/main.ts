import * as colors from "@std/fmt/colors";
import * as path from "@std/path";
import { ulid } from "@std/ulid";

export type FeedID = string;

export type FeedContentType =
  | "application/xml"
  | "application/json"
  | "application/atom+xml"
  | "application/rss+xml"
  | "application/feed+json"
  | "text/xml"
  | "text/json";

export type FeedFormat = "rss" | "atom" | "json" | "unknown";

export interface FeedData {
  id: FeedID;
  url: string;
  format: FeedFormat;
  title?: string | null;
  etag?: string | null;
  lastModified?: string | null;
}

/**
 * the shape of results returned by `fetchFeedItemsFromURL`
 */
export interface FetchResults {
  status: "modified" | "not-modified";
  contentType: string | null;
  etag: string | null;
  lastModified: string | null;
  body: string | null;
}

export class FilePersistence {
  private filePath: string;

  constructor(filename = "feeds.json") {
    this.filePath = path.join(Deno.cwd(), filename);
  }

  async ensureFile(): Promise<boolean | undefined> {
    try {
      const fileInfo = await Deno.stat(this.filePath);
      return fileInfo.isFile;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        await Deno.writeTextFile(this.filePath, "[]");
        console.log(
          colors.green("OK!"),
          `created new feeds file at ${this.filePath}`,
        );
      }
      throw error;
    }
  }

  async loadFeeds(): Promise<FeedData[]> {
    await this.ensureFile();

    try {
      const text = await Deno.readTextFile(this.filePath);
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

  async saveFeeds(feeds: FeedData[]): Promise<void> {
    const text = JSON.stringify(feeds, null, 2);
    await Deno.writeTextFile(this.filePath, text);
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

export async function fetchFeedMetadata(url: URL): Promise<FeedData> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`failed to fetch feed: ${response.status}`);
  }

  const id = ulid();
  const lastModified = response.headers.get("last-modified");
  const etag = response.headers.get("etag");
  const contentType = response.headers.get("content-type") ?? "";

  let format: FeedFormat = "unknown";

  if (contentType.includes("json")) {
    format = "json";
  }

  if (contentType.includes("rss")) {
    format = "rss"; // refine later if you want atom detection
  }

  if (contentType.includes("atom")) {
    format = "atom";
  }

  if (contentType === "") {
    console.error(
      colors.yellow("warning"),
      "couldn't determine feed format from content type",
    );
  }

  const text = await response.text();

  let title = null;

  if (format === "json") {
    try {
      const parsed = JSON.parse(text);
      title = typeof parsed.title === "string" ? parsed.title : null;
    } catch {
      /* ignore */
    }
  }

  if (format === "rss" || format === "atom") {
    const match = text.match(/<title>(.*?)<\/title>/i);
    if (match?.[1]) {
      title = match[1].trim();
    }
  }

  return {
    id,
    url: url.href,
    title,
    format,
    etag,
    lastModified,
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
 * responsible for fetching response body in chunks from a URL instance
 *
 * @param url
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
