import { assertEquals } from "@std/assert/equals";
import { ulid } from "@std/ulid/ulid";
import { join } from "@std/path/join";
import type { FeedData, FeedFormat } from "@stewpot/feeds";
import { FilePersistence } from "./storage.ts";
import { type Paths, SOURCES_FILENAME } from "./cli.ts";

Deno.test("FilePersistence saves and loads feeds correctly", async () => {
  const root = await Deno.makeTempDir();
  const paths: Paths = {
    root,
    sources: join(root, SOURCES_FILENAME),
  };
  const store = new FilePersistence(paths.sources);
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
