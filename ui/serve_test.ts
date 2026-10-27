import { assertEquals, assertStringIncludes } from "@std/assert";
import server from "./serve.ts";

Deno.test(async function fetchIndexPage() {
  const req = new Request("https://example.com");
  const res = await server.fetch(req);
  const body = await res.text();
  assertEquals(res.ok, true);
  assertEquals(res.headers.get("content-type"), "text/html; charset=utf-8");
  assertStringIncludes(body, "<h1>Stewpot UI System</h1>");
  assertStringIncludes(body, "<section>");
});
