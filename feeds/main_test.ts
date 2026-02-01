import { assertEquals } from "@std/assert/equals";
import { parseSubscribeInputToURL } from "@stewpot/feeds";

Deno.test(function normalizeSubscribeInputDomain() {
  const input = "example.com";
  const result = parseSubscribeInputToURL(input);
  assertEquals(result, new URL("https://example.com"));
});

Deno.test(function normalizeSubscribeInputFeedURL() {
  const input = "example.com/feed.xml";
  const result = parseSubscribeInputToURL(input);
  assertEquals(result, new URL("https://example.com/feed.xml"));
});

Deno.test(function normalizeSubscribeInputWithProtocol() {
  const input = "https://example.com";
  const result = parseSubscribeInputToURL(input);
  assertEquals(result, new URL("https://example.com"));
});
