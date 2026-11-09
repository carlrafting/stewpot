import { assertNotMatch, assertStringIncludes } from "@std/assert";
import { renderDocumentPage } from "./rendering.ts";

Deno.test("static document rendering escapes text and disables raw Markdown HTML", () => {
  const html = renderDocumentPage({
    id: "doc-1",
    title: "<script>alert(1)</script>",
    path: "/safe/",
    content: "",
    created: "2026-01-01",
    updated: "2026-01-01",
    draft: false,
  }, [{
    id: "block-1",
    type: "markdown",
    order: 0,
    content: {
      type: "markdown",
      body: "<img src=x onerror=alert(1)>\\n\\n**safe**",
    },
  }]);

  assertStringIncludes(html, "&lt;script&gt;alert(1)&lt;/script&gt;");
  assertStringIncludes(html, "&lt;img src=x onerror=alert(1)&gt;");
  assertStringIncludes(html, "<strong>safe</strong>");
  assertNotMatch(html, /<script>|<img src=x/);
});

Deno.test("legacy document content renders when there are no block records", () => {
  const html = renderDocumentPage({
    id: "legacy",
    title: "Legacy document",
    content: "**Existing content**",
    created: "2026-01-01",
    updated: "2026-01-01",
    draft: false,
  }, []);

  assertStringIncludes(html, "<strong>Existing content</strong>");
});
