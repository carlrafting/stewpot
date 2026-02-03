import * as colors from "@std/fmt/colors";
import * as path from "@std/path";

export interface FeedData {
  title: string | null;
  url: string;
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
        console.log(colors.green("OK!"), `created new feeds file at ${this.filePath}`);
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

function fetchFeedItemsFromURL() { }

export async function* fetchResponseBodyInChunksFromURL(url: URL): AsyncGenerator<string | undefined> {
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
