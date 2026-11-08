import { assertEquals } from "@std/assert";
import { documentPath, normalizeDocumentPath, slugifyTitle } from "./data.ts";

Deno.test("document paths are canonical and reject unsafe segments", () => {
  assertEquals(normalizeDocumentPath("/"), "/");
  assertEquals(normalizeDocumentPath("/about"), "/about/");
  assertEquals(normalizeDocumentPath("/journal/2026/"), "/journal/2026/");
  assertEquals(normalizeDocumentPath("/a//b/"), null);
  assertEquals(normalizeDocumentPath("/../secret/"), null);
  assertEquals(normalizeDocumentPath("/%2e%2e/secret/"), null);
  assertEquals(normalizeDocumentPath("//example.com/"), null);
  assertEquals(normalizeDocumentPath("/a?b"), null);
  assertEquals(normalizeDocumentPath("/a\\b/"), null);
});

Deno.test("title suggestions are URL-friendly and legacy paths remain stable", () => {
  assertEquals(slugifyTitle("Crème brûlée!"), "creme-brulee");
  assertEquals(slugifyTitle("!!!", "doc-1"), "doc-1");
  assertEquals(
    documentPath({ id: "doc-1", title: "About Us" }),
    "/about-us/",
  );
  assertEquals(
    documentPath({ id: "doc-1", title: "Renamed", path: "/about/" }),
    "/about/",
  );
});
