import { assertEquals } from "@std/assert/equals";
import { discoverFeed, parseInputToURL } from "./main.ts";

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
