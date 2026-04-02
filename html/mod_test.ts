import { assertThrows } from "@std/assert";
import { assertEquals } from "@std/assert/equals";
import { assertSnapshot } from "@std/testing/snapshot";
import { html, template } from "./mod.ts";

Deno.test("html should create header element correctly", (t) => {
  const header = html(
    "header",
    { "class": "foo" },
    ["This is my content"],
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
    undefined,
    true,
    true,
  );
  assertEquals(link, '<link href="/foo/bar">');
  assertSnapshot(t, link);
});

// Deno.test("buildHtmlDocument should create expected output", (t) => {
//   const result = buildHtmlDocument({
//     doctype: "html",
//     lang: "en",
//     html: {
//       children: [],
//     },
//     meta: {
//       charset: "utf-8",
//       viewport: "width=device-width, initial-scale=1.0",
//     },
//     title: "Hello World",
//     body: {
//       children: [
//         "<h1>",
//         "Hello World",
//         "</h1>",
//       ],
//     },
//   });
//   assertSnapshot(t, result);
// });

Deno.test("template should work with template literal strings", () => {
  const [data, t] = template({ lang: "en" });
  const result = t`<html lang="${data.lang}">`;
  assertEquals(result, `<html lang="en">`);
});

Deno.test("template should map multiple records of data to result string", () => {
  const [data, t] = template({ lang: "en", charset: "utf-8" });
  const result =
    t`<html lang="${data.lang}">\n<meta charset="${data.charset}">`;
  assertEquals(result, `<html lang="en">\n<meta charset="utf-8">`);
});

Deno.test("template should return string argument if no data were provided", () => {
  const [_, t] = template({});
  const result = t`Just a regular string`;
  assertEquals(result, "Just a regular string");
});

Deno.test("empty string value", () => {
  const [data, t] = template({ alt: "" });
  const result = t`<img src="/img.jpg" alt="${data.alt}">`;
  assertEquals(result, `<img src="/img.jpg" alt="">`);
});

Deno.test("unknown symbol throws", () => {
  const [_, t] = template({ lang: "en" });
  const rogue = Symbol("rogue");
  assertThrows(
    () => t`<html lang="${rogue}">`,
    Error,
    `Unknown symbol at position 0`,
  );
});

Deno.test("escape by default", async (c) => {
  const [d, t] = template({ content: `<nav></nav>` });
  const result = t`<header>
    ${d.content}
  </header>`;
  assertEquals(result, `<header>\n    &lt;nav&gt;&lt;/nav&gt;\n  </header>`);
  await assertSnapshot(c, result);
});

Deno.test("escape disabled", async (c) => {
  const [d, t] = template({ content: `<nav></nav>` }, { escape: false });
  const result = t`<header>
    ${d.content}
  </header>`;
  assertEquals(result, `<header>\n    <nav></nav>\n  </header>`);
  await assertSnapshot(c, result);
});
