import * as colors from "@std/fmt/colors";
import { ulid } from "@std/ulid";
import {
  detectAtomFeed,
  detectJsonFeed,
  detectRdfFeed,
  detectRssFeed,
  parseAtomFeed,
  parseFeed,
  parseJsonFeed,
  parseRdfFeed,
  parseRssFeed,
} from "feedsmith";
import type { Storage } from "./storage.ts";
export { defineConfig } from "./config.ts";

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
export type FeedFormat = "rss" | "atom" | "rdf" | "json" | "unknown";

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
  /** feed source title @deprecated */
  title?: string | null;
  /** reponse header etag (optional) */
  etag?: string | null;
  /** reponse header last-modified header (optional) @deprecated */
  lastModified?: string | null;
  /** timestamp when feed source was last fetched at */
  fetch_timestamp?: string;
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
    ok: boolean;
    statusText: string;
    statusCode: number;
    status: "modified" | "not-modified";
    contentType: string | null;
  };
}

/** A parsed feed's format and feedsmith payload. */
export type ParsedFeed = {
  format: "rss" | "atom" | "rdf" | "json";
  feed: object;
};

/**
 * This function takes parsed feed, content from response, metadata from headers, url and returns array of `FeedItems`
 *
 * @param parsed parsed feed from feedsmith
 * @param content response body content
 * @param metadata FeedData
 * @param url feed source URL instance
 */
export function mapToFeedItems(
  parsed: ParsedFeed,
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

  if (format === "rdf") {
    const rdf = parseRdfFeed(content);
    if (rdf?.items) {
      for (const item of rdf.items) {
        items.push({
          id: item.link ?? ulid(),
          feed: metadata.id,
          title: item.title ?? null,
          content: item.description ?? null,
          url: item.link,
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
          url: item?.url,
          content: item?.content_text ?? item?.content_html ?? null,
          published: item?.date_published,
        });
      }
    }
  }

  return items;
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

function detectFeedFormat(value: string): FeedFormat {
  if (detectAtomFeed(value)) {
    return "atom";
  }
  if (detectRdfFeed(value)) {
    return "rdf";
  }
  if (detectRssFeed(value)) {
    return "rss";
  }
  if (detectJsonFeed(value)) {
    return "json";
  }
  return "unknown";
}

/**
 * fetch metadata for feed source
 *
 * @param url URL instance to fetch metadata from
 */
export async function fetchFeedMetadata(
  url: URL,
): Promise<FeedData> {
  const id: FeedID = ulid();
  const response: Response = await fetch(url);
  const timestamp: Temporal.Instant = Temporal.Now.instant();

  if (!response.ok) {
    throw new Error(`failed to fetch feed from ${url.href}`);
  }

  const fetch_timestamp: string = timestamp.toString();
  const headers = response.headers;
  const etag = headers.get("etag");
  const text = await response.text();
  const format: FeedFormat = detectFeedFormat(text);

  return {
    id,
    url: url.href,
    fetch_timestamp,
    etag,
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

  const ok = response.ok;
  const statusCode = response.status;
  const statusText = response.statusText;
  const body = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  const format: FeedFormat = detectFeedFormat(body);
  const etag = response.headers.get("etag");
  const lastModified = response.headers.get("last-modified");

  return {
    id,
    url: url.href,
    format,
    etag,
    lastModified,
    body,
    fetch: {
      ok,
      statusCode,
      statusText,
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
 * Represents the raw result of successfully fetching and parsing a feed,
 * prior to mapping into {@linkcode FeedItem} instances.
 *
 * Returned by {@linkcode fetchAndParseFeed} and consumed by
 * {@linkcode processFetchAndParseResult}.
 *
 * @see {@linkcode fetchAndParseFeed}
 */
export type FetchedFeed = {
  /** The feed's stored metadata, retrieved prior to fetching. */
  metadata: FeedData;
  /** The parsed feed content, discriminated by format. */
  parsed: ParsedFeed;
  /** The raw response body string, used during item mapping. */
  body: string;
  /** The resolved URL the feed was fetched from. */
  url: URL;
};

/**
 * Fetches and parses a feed from the URL stored in the provided {@linkcode FeedData}.
 *
 * Handles all failure points gracefully — invalid URLs, network errors, non-ok
 * responses, empty bodies, and parse failures are all logged to the console
 * with a descriptive message. Returns `undefined` in any of these cases.
 *
 * @example
 * ```ts
 * const result = await fetchAndParseFeed(feed);
 * if (result) {
 *   await processFetchAndParseResult(feed, result, store, feeds);
 * }
 * ```
 *
 * @param feed - The feed to fetch and parse, must contain a valid URL.
 * @returns A {@linkcode FetchedFeed} if successful, or `undefined` if the feed
 * could not be fetched or parsed.
 */
export async function fetchAndParseFeed(
  feed: FeedData,
): Promise<FetchedFeed | undefined> {
  let url: URL;

  try {
    url = new URL(feed.url);
  } catch {
    console.error(
      colors.red("error"),
      `invalid url "${feed.url}" - urls must include a scheme e.g. https://example.com/feed.xml`,
    );
    return;
  }

  let metadata: FeedData;
  try {
    metadata = {
      ...await fetchFeedMetadata(url),
      id: feed.id,
    };
  } catch (error) {
    console.error(
      colors.red("error"),
      `failed to fetch metadata for ${feed.url}`,
      error,
    );
    return;
  }

  let results: FetchResults;
  try {
    results = await fetchFeedItemsFromURL(url, feed);
  } catch (error) {
    console.error(
      colors.red("error"),
      `failed to fetch ${feed.url}`,
      error,
    );
    return;
  }

  if (results.fetch.status === "not-modified") return;

  if (!results.fetch.ok) {
    console.error(
      colors.red("error"),
      `failed to fetch ${feed.url}: ${results.fetch.statusCode} ${results.fetch.statusText}`,
    );
    return;
  }

  if (!results.body) {
    console.error(
      colors.red("error"),
      `empty response body for ${feed.url} - the feed may be broken or temporarily unavailable`,
    );
    return;
  }

  try {
    const parsed = parseFeed(results.body);
    return { metadata, parsed, body: results.body, url };
  } catch (error) {
    console.error(
      colors.red("error"),
      `failed to parse feed ${feed.url} - the feed content may be malformed`,
      error,
    );
    return;
  }
}

/**
 * Fetches every subscribed feed in order and persists the parsed items.
 * Feed metadata in `feeds` is refreshed for each successfully fetched feed;
 * callers are responsible for persisting that array.
 */
export async function fetchAllFeeds(
  feeds: FeedData[],
  store: Pick<Storage, "saveItems">,
): Promise<void> {
  for (const feed of feeds) {
    const result = await fetchAndParseFeed(feed);
    if (!result) continue;

    const items = mapToFeedItems(
      result.parsed,
      result.body,
      result.metadata,
      result.url,
    );
    const feedIndex = feeds.findIndex((entry) => entry.id === feed.id);
    if (feedIndex === -1) {
      throw new Error(`feed not found: ${feed.id}`);
    }
    feeds[feedIndex] = { ...feed, ...result.metadata };
    await store.saveItems(feed.id, items, feeds);
    console.log(
      colors.green("ok"),
      `saved feed items for ${result.url.hostname}`,
    );
  }
}

/**
 * parse input string and return URL instance
 *
 * @param input url string input
 */
export function parseInputToURL(input: string): URL | undefined {
  const url = toFeedURL(input);
  if (!url) console.error(colors.red("error"), "invalid URL format!");
  return url;
}

function toFeedURL(input: string): URL | undefined {
  if (!input.startsWith("http://") && !input.startsWith("https://")) {
    input = `https://${input}`;
  }
  try {
    return new URL(input);
  } catch (_error) {
    return undefined;
  }
}

/** Resolves a feed input string to a URL, adding HTTPS when needed. */
export function resolveFeedInput(
  input: string | number | undefined,
): URL | undefined {
  if (typeof input !== "string" || !input.trim()) return;
  return parseInputToURL(input.trim());
}

/** Finds a subscription by exact URL or matching hostname. */
export function findFeedByUrl(
  feeds: FeedData[],
  value: URL | string | undefined,
): FeedData | undefined {
  const url = typeof value === "string" ? toFeedURL(value.trim()) : value;
  if (!url) return undefined;

  return feeds.find((feed) => {
    try {
      const current = new URL(feed.url);
      return current.href === url.href || current.hostname === url.hostname;
    } catch {
      return false;
    }
  });
}

/** Adds a subscription and persists its metadata and items. */
export async function persistFeedSubscription(
  store: Storage,
  feeds: FeedData[],
  metadata: FeedData,
  items: FeedItem[],
): Promise<void> {
  feeds.push(metadata);
  await store.saveFeeds(feeds);
  await store.saveItems(metadata.id, items, feeds);
}

/** A subscription input that was rejected; `status` is an HTTP-style code. */
export class SubscriptionError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SubscriptionError";
    this.status = status;
  }
}

/** Thrown when a discovered feed URL must be confirmed before subscribing. */
export class ConfirmationRequiredError extends Error {
  url: string;
  constructor(url: string) {
    super("confirmation required");
    this.name = "ConfirmationRequiredError";
    this.url = url;
  }
}

/**
 * Validates input, discovers feeds for hostnames, and subscribes to the feed.
 * Shared by the CLI and the reader.
 *
 * @param input user supplied feed URL or hostname
 * @param feeds current subscriptions, updated in place when subscribed
 * @param store storage used to persist the subscription
 * @param confirm called with the discovered feed URL before subscribing to a
 * hostname; returning `false` cancels the subscription
 * @returns the subscribed feed, or `undefined` when cancelled
 * @throws {SubscriptionError} when the input is invalid or already subscribed
 */
export async function subscribeToFeed(
  input: unknown,
  feeds: FeedData[],
  store: Storage,
  confirm: (url: URL) => boolean | Promise<boolean>,
): Promise<FeedData | undefined> {
  if (typeof input !== "string" || !input.trim()) {
    throw new SubscriptionError("invalid input format!", 400);
  }
  let url = toFeedURL(input.trim());
  if (!url) throw new SubscriptionError("invalid URL format!", 400);

  if (findFeedByUrl(feeds, url)) {
    throw new SubscriptionError("URL already exists!", 409);
  }

  if (url.pathname === "/") {
    const discovered = await discoverFeed(url.href);
    if (discovered) url = new URL(discovered);
    if (!await confirm(url)) return undefined;
  }

  const metadata = await fetchFeedMetadata(url);
  const { body } = await fetchFeedItemsFromURL(url, metadata);
  if (!body || body.trim() === "") {
    throw new SubscriptionError("no content for feed source", 422);
  }

  let parsed: ParsedFeed;
  try {
    parsed = parseFeed(body);
  } catch (_error) {
    throw new SubscriptionError(
      `failed to parse feed ${url.href} - the feed content may be malformed`,
      422,
    );
  }

  const items = mapToFeedItems(parsed, body, metadata, url);
  await persistFeedSubscription(store, feeds, metadata, items);
  return metadata;
}
