import { assertEquals } from "@std/assert/equals";
import {
  atomParser,
  discoverFeed,
  type FeedData,
  type FeedFormat,
  FilePersistence,
  parseInputToURL,
  rssParser,
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

Deno.test("rss parser works correctly", async () => {
  const rss = await Deno.readTextFile("fixtures/rss.xml");
  const items = rssParser.parse(rss);
  assertEquals(items?.length, 5);
  assertEquals(
    items?.[0].title,
    "Louisiana Students to Hear from NASA Astronauts Aboard Space Station",
  );
  assertEquals(
    items?.[0].url,
    "http://www.nasa.gov/press-release/louisiana-students-to-hear-from-nasa-astronauts-aboard-space-station",
  );
});

Deno.test("atom parser works correctly", async () => {
  const atom = await Deno.readTextFile("fixtures/atom.xml");
  const items = atomParser.parse(atom);
  assertEquals(items?.length, 2);
  assertEquals(
    items?.[0].title,
    "Atom-Powered Robots Run Amok",
  );
  assertEquals(
    items?.[0].url,
    "http://example.org/2003/12/13/atom03",
  );
});
