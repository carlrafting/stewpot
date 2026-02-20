import { assertEquals } from "@std/assert/equals";
import { assertSnapshot } from "@std/testing/snapshot";
import { html } from "./mod.ts";

Deno.test("html should create header element correctly", (t) => {
  const header = html(
    "header",
    { "class": "foo" },
    "This is my content",
  );
  assertEquals(
    header,
    `<header class="foo">
This is my content
</header>`,
  );
  assertSnapshot(t, header);
});

Deno.test("html should create link element correctly", (t) => {
  const link = html(
    "link",
    { "href": "/foo/bar" },
    null,
    true,
    true,
  );
  assertEquals(link, '<link href="/foo/bar">');
  assertSnapshot(t, link);
});
