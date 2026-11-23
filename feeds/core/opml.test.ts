import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import type { FeedData } from "./main.ts";
import { feedsToOpml, importOpml, parseOpmlFeeds } from "./opml.ts";

const feed = (url: string, title?: string): FeedData => ({
  id: url,
  url,
  format: "rss",
  ...(title ? { title } : {}),
});

function memoryStore() {
  const saved: FeedData[][] = [];
  return {
    saved,
    saveFeeds: (feeds: FeedData[]) => {
      saved.push(structuredClone(feeds));
      return Promise.resolve();
    },
  };
}

Deno.test("feedsToOpml exports one outline per feed", () => {
  const xml = feedsToOpml([
    feed("https://a.example/feed.xml", "Site A"),
    feed("https://b.example/atom.xml"),
  ]);

  assertEquals(parseOpmlFeeds(xml), [
    { url: "https://a.example/feed.xml", title: "Site A" },
    { url: "https://b.example/atom.xml", title: "b.example" },
  ]);
});

Deno.test("feedsToOpml escapes special characters", () => {
  const url = "https://a.example/feed?x=1&y=2";
  const xml = feedsToOpml([feed(url, `Tom & "Jerry" <3`)]);

  assertEquals(parseOpmlFeeds(xml), [{ url, title: `Tom & "Jerry" <3` }]);
});

Deno.test("feedsToOpml exports a valid empty document", () => {
  assertEquals(parseOpmlFeeds(feedsToOpml([])), []);
});

Deno.test("parseOpmlFeeds flattens folders and ignores outlines without xmlUrl", () => {
  const xml = `<?xml version="1.0"?>
<opml version="2.0">
  <head><title>Mine</title></head>
  <body>
    <outline text="Tech">
      <outline text="One" type="rss" xmlUrl="https://one.example/feed"/>
      <outline text="Nested">
        <outline title="Two" text="ignored" xmlUrl="https://two.example/feed"/>
      </outline>
    </outline>
    <outline text="No title" xmlUrl="https://three.example/feed"/>
    <outline text="Just a label"/>
  </body>
</opml>`;

  assertEquals(parseOpmlFeeds(xml), [
    { url: "https://one.example/feed", title: "One" },
    { url: "https://two.example/feed", title: "Two" },
    { url: "https://three.example/feed", title: "No title" },
  ]);
});

Deno.test("importOpml adds new feeds without fetching and persists them", async () => {
  const feeds = [feed("https://old.example/feed")];
  const store = memoryStore();
  const xml = feedsToOpml([
    feed("https://new.example/feed", "New"),
    feed("https://other.example/feed"),
  ]);

  const result = await importOpml(xml, feeds, store);

  assertEquals(result.added.map((f) => f.url), [
    "https://new.example/feed",
    "https://other.example/feed",
  ]);
  assertEquals(result.skipped, []);
  assertEquals(result.added[0].title, "New");
  assertEquals(result.added[0].format, "unknown");
  assertEquals(new Set(result.added.map((f) => f.id)).size, 2);
  assertEquals(feeds.length, 3);
  assertEquals(store.saved.length, 1);
  assertEquals(store.saved[0].length, 3);
});

Deno.test("importOpml skips duplicates by exact URL, not hostname", async () => {
  const feeds = [feed("https://site.example/blog.xml")];
  const store = memoryStore();
  const xml = feedsToOpml([
    feed("https://site.example/blog.xml"),
    feed("https://site.example/news.xml"),
    feed("https://site.example/news.xml"),
  ]);

  const result = await importOpml(xml, feeds, store);

  assertEquals(result.added.map((f) => f.url), [
    "https://site.example/news.xml",
  ]);
  assertEquals(result.skipped, [
    { url: "https://site.example/blog.xml", reason: "duplicate" },
    { url: "https://site.example/news.xml", reason: "duplicate" },
  ]);
});

Deno.test("importOpml skips invalid and non-http URLs", async () => {
  const xml = `<opml version="2.0"><head/><body>
    <outline text="a" xmlUrl="not a url"/>
    <outline text="b" xmlUrl="ftp://files.example/feed"/>
    <outline text="c" xmlUrl="https://ok.example/feed"/>
  </body></opml>`;
  const store = memoryStore();

  const result = await importOpml(xml, [], store);

  assertEquals(result.added.map((f) => f.url), ["https://ok.example/feed"]);
  assertEquals(result.skipped, [
    { url: "not a url", reason: "invalid-url" },
    { url: "ftp://files.example/feed", reason: "invalid-url" },
  ]);
});

Deno.test("importOpml does not write when nothing was added", async () => {
  const feeds = [feed("https://a.example/feed")];
  const store = memoryStore();

  const result = await importOpml(feedsToOpml(feeds), feeds, store);

  assertEquals(result.added, []);
  assertEquals(store.saved, []);
});

Deno.test("invalid OPML is rejected", async () => {
  assertThrows(() => parseOpmlFeeds("this is not xml"));
  await assertRejects(() => importOpml("<html></html>", [], memoryStore()));
});
