import { assertEquals } from "@std/assert/equals";
import {
  discoverFeed,
  type FeedData,
  fetchAndParseFeed,
  parseInputToURL,
} from "./main.ts";
import { stub } from "@std/testing/mock";

const atomFixture = await Deno.readTextFile("./fixtures/atom.xml");
const rssFixture = await Deno.readTextFile("./fixtures/rss.xml");

const baseFeed: FeedData = {
  id: "01HZFAKEULID000000000000",
  url: "https://example.com/feed.xml",
  format: "atom",
};

function mockFetch(body: string, status = 200) {
  return stub(globalThis, "fetch", () =>
    Promise.resolve(
      new Response(body, {
        status,
        headers: { "content-type": "application/xml" },
      }),
    ));
}

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

Deno.test("fetchAndParseFeed - returns undefined for invalid URL", async () => {
  const result = await fetchAndParseFeed({ ...baseFeed, url: "not-a-url" });
  assertEquals(result, undefined);
});

Deno.test("fetchAndParseFeed - returns undefined when fetch returns non-ok response", async () => {
  using _ = mockFetch("", 404);
  const result = await fetchAndParseFeed(baseFeed);
  assertEquals(result, undefined);
});

Deno.test("fetchAndParseFeed - returns undefined for empty body", async () => {
  using _ = mockFetch("");
  const result = await fetchAndParseFeed(baseFeed);
  assertEquals(result, undefined);
});

Deno.test("fetchAndParseFeed - returns undefined for unparseable body", async () => {
  using _ = mockFetch("this is not a feed");
  const result = await fetchAndParseFeed(baseFeed);
  assertEquals(result, undefined);
});

Deno.test("fetchAndParseFeed - parses atom feed successfully", async () => {
  using _ = mockFetch(atomFixture);
  const result = await fetchAndParseFeed({ ...baseFeed, format: "atom" });
  assertEquals(result?.parsed.format, "atom");
  assertEquals(result?.url.href, baseFeed.url);
});

Deno.test("fetchAndParseFeed - parses rss feed successfully", async () => {
  using _ = mockFetch(rssFixture);
  const result = await fetchAndParseFeed({ ...baseFeed, format: "rss" });
  assertEquals(result?.parsed.format, "rss");
  assertEquals(result?.url.href, baseFeed.url);
});
