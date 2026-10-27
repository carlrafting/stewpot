import { assertEquals } from "@std/assert/equals";
import { ulid } from "@std/ulid/ulid";
import { join } from "@std/path/join";
import type { FeedData, FeedFormat } from "@stewpot/feeds";
import { FsStorage, KvStorage } from "./storage.ts";
import { type Paths, SOURCES_FILENAME } from "../cli/main.ts";

Deno.test("FsStorage should load and save feeds correctly", async () => {
  const root = await Deno.makeTempDir();
  const paths: Paths = {
    root,
    sources: join(root, SOURCES_FILENAME),
  };
  const store = new FsStorage(paths.sources);
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
  const loaded: FeedData[] = await store.loadFeeds();

  assertEquals(loaded, feeds);
  assertEquals(loaded.length, feeds.length);
});

Deno.test("FsStorage initializes a missing feeds file and reads missing items as empty", async () => {
  const root = await Deno.makeTempDir();
  const store = new FsStorage(join(root, SOURCES_FILENAME));

  assertEquals(await store.loadFeeds(), []);
  assertEquals(await store.loadItems("missing-feed"), []);
});

Deno.test("KvStorage should load and save feeds correctly", async () => {
  const path = await Deno.makeTempFile();
  const kv = await Deno.openKv(path);
  const store = new KvStorage(kv);
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
  const loaded: FeedData[] = await store.loadFeeds();
  assertEquals(loaded, feeds);
  assertEquals(loaded.length, feeds.length);
  kv.close();
});
