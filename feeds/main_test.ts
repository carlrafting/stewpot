import { assertEquals } from "@std/assert/equals";
import {
  discoverFeed,
  type FeedData,
  type FeedFormat,
  FilePersistence,
  parseInputToURL,
} from "./main.ts";
import { type Paths, SOURCES_FILENAME } from "./cli.ts";
import { join } from "@std/path/join";
import { ulid } from "@std/ulid";

Deno.test("should normalize domain string input to URL", function normalizeSubscribeInputDomain() {
  const input = "example.com";
  const result = parseInputToURL(input);
  assertEquals(result, new URL("https://example.com"));
});

Deno.test("should normalize feed path input to URL", function normalizeSubscribeInputFeedURL() {
  const input = "example.com/feed.xml";
  const result = parseInputToURL(input);
  assertEquals(result, new URL("https://example.com/feed.xml"));
});

Deno.test("should normalize url string input to URL", function normalizeSubscribeInputWithProtocol() {
  const input = "https://example.com";
  const result = parseInputToURL(input);
  assertEquals(result, new URL("https://example.com"));
});

Deno.test("should discover feed link on carlrafting.com", async () => {
  const result = await discoverFeed("https://carlrafting.com");
  assertEquals(result, "https://carlrafting.com/feed.xml");
});

Deno.test("FilePersistence saves and loads feeds correctly", async () => {
  const root = await Deno.makeTempDir();
  const paths: Paths = {
    root,
    sources: join(root, SOURCES_FILENAME),
  };
  const store = new FilePersistence(paths);
  const id = ulid();
  const format: FeedFormat = "unknown";
  const feeds: FeedData[] = [
    {
      id,
      url: "https://example.com/feed.xml",
      format,
    },
  ];

  await store.saveFeeds(feeds);
  const loaded = await store.loadFeeds();

  assertEquals(loaded, feeds);
  assertEquals(loaded.length, feeds.length);
});
