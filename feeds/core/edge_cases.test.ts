import { assertEquals } from "@std/assert/equals";
import { stub } from "@std/testing/mock";
import { join } from "@std/path/join";
import type { FeedData, FeedItem } from "./main.ts";
import { discoverFeed, mapToFeedItems } from "./main.ts";
import { FsStorage, KvStorage } from "./storage.ts";
import { SOURCES_FILENAME } from "../cli/main.ts";

Deno.test("discoverFeed returns the first working common feed URL", async () => {
  const calls: string[] = [];

  using _ = stub(globalThis, "fetch", async (input) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.href
      : input.url;
    calls.push(url);

    if (url.endsWith("/feed.xml")) {
      return new Response("", { status: 404 });
    }

    if (url.endsWith("/rss.xml")) {
      return new Response("", { status: 200 });
    }

    return new Response("", { status: 404 });
  });

  const result = await discoverFeed("https://example.com");

  assertEquals(result, "https://example.com/rss.xml");
  assertEquals(calls.includes("https://example.com/feed.xml"), true);
  assertEquals(calls.includes("https://example.com/rss.xml"), true);
});

Deno.test("discoverFeed returns undefined when every common candidate fails", async () => {
  using _ = stub(globalThis, "fetch", async () => new Response("", { status: 404 }));

  const result = await discoverFeed("https://example.com");

  assertEquals(result, undefined);
});

Deno.test("mapToFeedItems handles partial Atom entries without crashing", () => {
  const atomFixture = `
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <id>entry-1</id>
        <title>Example title</title>
      </entry>
    </feed>
  `;

  const result = mapToFeedItems(
    { format: "atom", feed: {} },
    atomFixture,
    { id: "feed-1", url: "https://example.com/feed.xml", format: "atom" },
    new URL("https://example.com/feed.xml"),
  );

  assertEquals(result.length, 1);
  assertEquals(result[0].id, "entry-1");
  assertEquals(result[0].feed, "feed-1");
  assertEquals(result[0].title, "Example title");
  assertEquals(result[0].summary, null);
  assertEquals(result[0].content, null);
  assertEquals(result[0].url, undefined);
});

Deno.test("FsStorage saves, loads, and removes feed item files for a feed", async () => {
  const root = await Deno.makeTempDir();
  const store = new FsStorage(join(root, SOURCES_FILENAME));
  const feeds: FeedData[] = [{
    id: "feed-1",
    url: "https://example.com/feed.xml",
    format: "rss",
  }];

  const items: FeedItem[] = [{
    id: "item-1",
    feed: "feed-1",
    title: "Example item",
    url: "https://example.com/items/1",
    content: "Example content",
  }];

  await store.saveFeeds(feeds);
  await store.saveItems("feed-1", items, feeds);

  assertEquals(await store.loadItems("feed-1"), items);

  await store.removeItems("feed-1");
  assertEquals(await store.loadItems("feed-1"), []);
});

Deno.test("KvStorage round-trips feed items by feed id", async () => {
  const kv = await Deno.openKv(await Deno.makeTempFile());
  const store = new KvStorage(kv);

  const feeds: FeedData[] = [{
    id: "feed-1",
    url: "https://example.com/feed.xml",
    format: "rss",
  }];

  const items: FeedItem[] = [{
    id: "item-1",
    feed: "feed-1",
    title: "Example item",
    url: "https://example.com/items/1",
    content: "Example content",
  }];

  await store.saveFeeds(feeds);
  await store.saveItems("feed-1", items, feeds);

  assertEquals(await store.loadFeeds(), feeds);
  assertEquals(await store.loadItems("feed-1"), items);

  await store.removeItems("feed-1");
  assertEquals(await store.loadItems("feed-1"), []);

  kv.close();
});
