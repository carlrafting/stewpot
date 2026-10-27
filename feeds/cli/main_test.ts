import { assertEquals, assertGreater, assertExists } from "@std/assert";
import { join } from "@std/path/join";
import { assertSnapshot } from "@std/testing/snapshot";
import {
  CONFIG_FILENAME,
  findFeedByUrl,
  removeFeedByUrl,
  resolveFeedInput,
  run,
} from "./main.ts";
import { loadConfig } from "./config.ts";
import type { FeedData } from "../core/main.ts";

const sampleFeeds: FeedData[] = [
  {
    id: "feed-1",
    url: "https://example.com/feed.xml",
    format: "rss",
    fetch_timestamp: "2024-01-01T00:00:00Z",
  },
  {
    id: "feed-2",
    url: "https://example.org/feed.json",
    format: "json",
    fetch_timestamp: "2024-01-02T00:00:00Z",
  },
];

Deno.test(
  "listCommand should list feed sources if there are more than 0",
  async () => {
    const args = ["list"];
    const command = run(args);
    const results = await command.output();
    assertEquals(results.success, true);
    assertEquals(results.code, 0);
    assertGreater(results.stdout.length, 0);
  },
);

Deno.test("resolveFeedInput adds https scheme for bare hostnames", () => {
  const url = resolveFeedInput("example.com/feed.xml");
  assertExists(url);
  assertEquals(url?.href, "https://example.com/feed.xml");
});

Deno.test("findFeedByUrl matches both exact and hostname-based feed identifiers", () => {
  const byHref = findFeedByUrl(sampleFeeds, new URL("https://example.com/feed.xml"));
  const byHostname = findFeedByUrl(sampleFeeds, new URL("https://example.com/"));
  const missing = findFeedByUrl(sampleFeeds, new URL("https://missing.example/feed.xml"));

  assertEquals(byHref?.id, "feed-1");
  assertEquals(byHostname?.id, "feed-1");
  assertEquals(missing, undefined);
});

Deno.test("removeFeedByUrl removes the matching subscription without altering others", () => {
  const updated = removeFeedByUrl(sampleFeeds, "https://example.org/feed.json");
  assertEquals(updated.length, 1);
  assertEquals(updated[0].id, "feed-1");
});

Deno.test("should load config file it exists", async (t) => {
  await t.step("exists", async () => {
    const tempDir = await Deno.makeTempDir();
    const path = join(tempDir, CONFIG_FILENAME);
    await Deno.writeTextFile(path, "");
    const results = await loadConfig(path);
    await assertSnapshot(t, results);
  });
  await t.step("notexists", async (t) => {
    const path = undefined;
    const results = await loadConfig(path);
    await assertSnapshot(t, results);
  });
});
