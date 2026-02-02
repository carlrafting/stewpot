import { assertEquals } from "@std/assert";
import { assertSnapshot } from "@std/testing/snapshot";
import server from "./serve.ts";

Deno.test(async function fetchIndexPage(t) {
  const req = new Request("https://example.com");
  const res = await server.fetch(req);
  const template = await Deno.readTextFile("./templates/index.html");
  assertEquals(res.ok, true);
  assertEquals(res.headers.get("content-type"), "text/html; charset=utf-8");
  await assertSnapshot(t, template, "HTML template for index page");
});
