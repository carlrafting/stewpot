import { assertEquals } from "@std/assert/equals";
import {
  discoverFeed,
  type FeedData,
  fetchAndParseFeed,
  mapToFeedItems,
  parseInputToURL,
} from "./main.ts";
import { stub } from "@std/testing/mock";

const atomFixture = await Deno.readTextFile(
  new URL("../fixtures/atom.xml", import.meta.url),
);
const rssFixture = await Deno.readTextFile(
  new URL("../fixtures/rss.xml", import.meta.url),
);

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
  assertEquals(result?.metadata.id, baseFeed.id);
});

Deno.test("fetchAndParseFeed - parses rss feed successfully", async () => {
  using _ = mockFetch(rssFixture);
  const result = await fetchAndParseFeed({ ...baseFeed, format: "rss" });
  assertEquals(result?.parsed.format, "rss");
  assertEquals(result?.url.href, baseFeed.url);
});

Deno.test("mapToFeedItems maps RDF feed entries", () => {
  const rdfFixture =
    `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/"><channel><title>Example</title><link>https://example.com/</link><description>Example</description></channel><item><title>Entry</title><link>https://example.com/item</link><description>Entry body</description></item></rdf:RDF>`;
  const result = mapToFeedItems(
    { format: "rdf", feed: {} },
    rdfFixture,
    { ...baseFeed, id: "feed-1" },
    new URL("https://example.com/feed.rdf"),
  );
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "https://example.com/item");
  assertEquals(result[0].feed, "feed-1");
  assertEquals(result[0].title, "Entry");
  assertEquals(result[0].url, "https://example.com/item");
});

Deno.test("fetchAndParseFeed detects RDF and preserves the subscribed feed ID", async () => {
  const rdfFixture =
    `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/"><channel><title>Example</title><link>https://example.com/</link><description>Example</description></channel><item><title>Entry</title><link>https://example.com/item</link><description>Entry body</description></item></rdf:RDF>`;
  using _ = mockFetch(rdfFixture);
  const result = await fetchAndParseFeed(baseFeed);

  assertEquals(result?.parsed.format, "rdf");
  assertEquals(result?.metadata.format, "rdf");
  assertEquals(result?.metadata.id, baseFeed.id);
});
