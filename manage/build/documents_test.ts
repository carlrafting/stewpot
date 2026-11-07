import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { join } from "@std/path/join";
import {
  collectDocumentBuildSnapshot,
  writeDocumentPages,
} from "./documents.ts";

Deno.test("build snapshot includes published documents and ordered blocks only", async () => {
  const root = await Deno.makeTempDir();
  const kv = await Deno.openKv(join(root, "kv.db"));
  try {
    await kv.set(["documents", "published"], {
      id: "published",
      title: "Welcome",
      path: "/",
      content: "Legacy text",
      created: "2026-01-01",
      updated: "2026-01-01",
      draft: false,
    });
    await kv.set(["documents", "draft"], {
      id: "draft",
      title: "Not public",
      path: "/draft/",
      content: "",
      created: "2026-01-01",
      updated: "2026-01-01",
      draft: true,
    });
    await kv.set(["blocks", "published", "second"], {
      id: "second",
      type: "heading",
      order: 1,
      content: { type: "heading", level: 2, text: "Second" },
    });
    await kv.set(["blocks", "published", "first"], {
      id: "first",
      type: "text",
      order: 0,
      content: { type: "text", body: "First" },
    });

    const pages = await collectDocumentBuildSnapshot(kv);
    assertEquals(pages.length, 1);
    assertEquals(pages[0].path, "/");
    assertEquals(pages[0].blocks.map((block) => block.id), ["first", "second"]);

    const output = join(root, "generated");
    assertEquals(await writeDocumentPages(pages, output), ["published"]);
    const html = await Deno.readTextFile(join(output, "index.html"));
    assertStringIncludes(html, "<title>Welcome</title>");
    assertStringIncludes(html, "First");
    assertStringIncludes(html, "<h2>Second</h2>");
    assertEquals(
      await Deno.stat(join(output, "draft", "index.html")).then(
        () => true,
        () => false,
      ),
      false,
    );
  } finally {
    await kv.close();
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("build snapshot rejects duplicate output paths", async () => {
  const root = await Deno.makeTempDir();
  const kv = await Deno.openKv(join(root, "kv.db"));
  try {
    for (const id of ["one", "two"]) {
      await kv.set(["documents", id], {
        id,
        title: id,
        path: "/same/",
        content: "",
        created: "2026-01-01",
        updated: "2026-01-01",
        draft: false,
      });
    }
    await assertRejects(
      () => collectDocumentBuildSnapshot(kv),
      Error,
      "share the path",
    );
  } finally {
    await kv.close();
    await Deno.remove(root, { recursive: true });
  }
});
