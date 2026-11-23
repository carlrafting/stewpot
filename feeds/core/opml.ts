import { generateOpml, parseOpml } from "feedsmith";
import { ulid } from "@std/ulid";
import type { FeedData } from "./main.ts";
import type { Storage } from "./storage.ts";

/** A subscription read from an OPML document. */
export interface OpmlFeed {
  /** The feed URL (`xmlUrl`). */
  url: string;
  /** The outline's title or text, when present. */
  title?: string;
}

/** Why an OPML entry was not imported. */
export type OpmlSkipReason = "duplicate" | "invalid-url";

/** The outcome of {@linkcode importOpml}. */
export interface OpmlImportResult {
  /** Subscriptions that were added. */
  added: FeedData[];
  /** Entries that were not added, with the reason. */
  skipped: { url: string; reason: OpmlSkipReason }[];
}

/** Options for {@linkcode feedsToOpml}. */
export interface OpmlExportOptions {
  /** Title of the OPML document. Defaults to `"Subscriptions"`. */
  title?: string;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Serializes subscriptions to an OPML 2.0 document, one outline per feed.
 *
 * @param feeds subscriptions to export
 * @param options export options
 * @returns the OPML document as a string
 */
export function feedsToOpml(
  feeds: FeedData[],
  options: OpmlExportOptions = {},
): string {
  const title = options.title ?? "Subscriptions";
  // feedsmith rejects an empty outline list, so emit an empty body ourselves.
  if (feeds.length === 0) {
    return `<?xml version="1.0" encoding="utf-8"?>\n<opml version="2.0">\n` +
      `  <head>\n    <title>${escapeXml(title)}</title>\n  </head>\n` +
      `  <body/>\n</opml>\n`;
  }
  return generateOpml({
    head: { title },
    body: {
      outlines: feeds.map((feed) => {
        const text = feed.title?.trim() || hostnameOf(feed.url);
        return { text, title: text, type: "rss", xmlUrl: feed.url };
      }),
    },
  });
}

type Outline = {
  text?: string;
  title?: string;
  xmlUrl?: string;
  outlines?: Outline[];
};

function collect(outlines: Outline[] | undefined, found: OpmlFeed[]): void {
  for (const outline of outlines ?? []) {
    const url = outline.xmlUrl?.trim();
    if (url) {
      const title = (outline.title ?? outline.text)?.trim();
      found.push(title ? { url, title } : { url });
    }
    // Folders nest outlines; flatten them since subscriptions have no groups.
    collect(outline.outlines, found);
  }
}

/**
 * Extracts every feed (an outline with an `xmlUrl`) from an OPML document,
 * flattening nested folders.
 *
 * @param xml OPML document
 * @returns the feeds found, in document order
 * @throws when `xml` is not a valid OPML document
 */
export function parseOpmlFeeds(xml: string): OpmlFeed[] {
  const found: OpmlFeed[] = [];
  collect(parseOpml(xml).body?.outlines as Outline[] | undefined, found);
  return found;
}

function normalize(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
    return parsed.href;
  } catch {
    return undefined;
  }
}

/**
 * Subscribes to every new feed in an OPML document and persists the result.
 *
 * Feeds are matched against existing subscriptions by exact URL (unlike
 * `findFeedByUrl`, which also matches hostnames, and would wrongly drop
 * several feeds from the same site). No network requests are made: items are
 * populated by the next fetch.
 *
 * @param xml OPML document
 * @param feeds current subscriptions, updated in place
 * @param store storage used to persist the updated subscriptions
 * @throws when `xml` is not a valid OPML document
 */
export async function importOpml(
  xml: string,
  feeds: FeedData[],
  store: Pick<Storage, "saveFeeds">,
): Promise<OpmlImportResult> {
  const result: OpmlImportResult = { added: [], skipped: [] };
  const seen = new Set(feeds.map((feed) => normalize(feed.url) ?? feed.url));

  for (const entry of parseOpmlFeeds(xml)) {
    const url = normalize(entry.url);
    if (!url) {
      result.skipped.push({ url: entry.url, reason: "invalid-url" });
      continue;
    }
    if (seen.has(url)) {
      result.skipped.push({ url, reason: "duplicate" });
      continue;
    }
    seen.add(url);
    const feed: FeedData = {
      id: ulid(),
      url,
      format: "unknown",
      ...(entry.title ? { title: entry.title } : {}),
    };
    feeds.push(feed);
    result.added.push(feed);
  }

  if (result.added.length > 0) await store.saveFeeds(feeds);
  return result;
}
