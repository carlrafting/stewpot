import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path/from-file-url";
import { toFileUrl } from "@std/path/to-file-url";
import { app } from "./main.ts";

const testHandlers = new Map<string, Awaited<ReturnType<typeof app>>>();

async function createTestHandler(root: string) {
  const rootUrl = toFileUrl(root).href.replace(/\/?$/, "/");
  const sessionsPath = fromFileUrl(new URL("sessions.db", rootUrl));
  const kvPath = fromFileUrl(new URL("kv.db", rootUrl));

  const handler = await app({
    meta: { url: rootUrl },
    sessions: { path: sessionsPath },
    kv: { path: kvPath },
  });
  testHandlers.set(root, handler);
  return handler;
}

function closeTestHandler(root: string) {
  const handler = testHandlers.get(root);
  if (!handler) return;
  handler.close();
  testHandlers.delete(root);
}

function createInfo(): Deno.ServeHandlerInfo {
  return {
    remoteAddr: {
      hostname: "127.0.0.1",
      port: 0,
      transport: "tcp",
    },
    completed: Promise.resolve(),
  };
}

function kvFilePath(root: string): string {
  const rootUrl = toFileUrl(root).href.replace(/\/?$/, "/");
  return fromFileUrl(new URL("kv.db", rootUrl));
}

function getSessionId(response: Response): string {
  const setCookie = response.headers.get("set-cookie");
  assert(setCookie, "expected a set-cookie header");
  const cookieValue = setCookie.split(";")[0]?.split("=")[1];
  assert(cookieValue, "expected a session cookie value");
  return cookieValue;
}

Deno.test("requests without a session receive a new session cookie", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const request = new Request("https://example.com/");
    const response = await handler.fetch(request, createInfo());

    assertEquals(response.status, 302);
    assertEquals(response.headers.get("location"), request.url);
    assertStringIncludes(response.headers.get("set-cookie") ?? "", "session=");
  } finally {
    closeTestHandler(root);
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("documents page renders when the session cookie is present", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/documents/new/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);
    const request = new Request("https://example.com/documents/new/", {
      headers: {
        cookie: `session=${sessionId}`,
      },
    });

    const response = await handler.fetch(request, createInfo());
    assertEquals(response.status, 200);
    const page = await response.text();
    assertStringIncludes(page, "New Document");
  } finally {
    closeTestHandler(root);
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("document creation saves data and redirects to the edit screen", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/documents/new/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);
    const form = new URLSearchParams({
      title: "Welcome post",
      content: "This is the body of the document.",
      draft: "true",
    });

    const response = await handler.fetch(
      new Request("https://example.com/documents/create/", {
        method: "POST",
        headers: {
          cookie: `session=${sessionId}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      }),
      createInfo(),
    );

    assertEquals(response.status, 302);
    const location = response.headers.get("location");
    assert(location, "expected a redirect location");
    assertStringIncludes(location, "/document/");
    assertStringIncludes(location, "/edit/");

    const kv = await Deno.openKv(kvFilePath(root));
    const documents: unknown[] = [];
    for await (const entry of kv.list({ prefix: ["documents"] })) {
      documents.push(entry.value);
    }
    assertEquals(documents.length, 1);

    const document = documents[0] as {
      title: string;
      content: string;
      draft: boolean;
    };
    assertEquals(document.title, "Welcome post");
    assertEquals(document.content, "This is the body of the document.");
    assertEquals(document.draft, true);
    await kv.close();
  } finally {
    closeTestHandler(root);
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("documents index displays saved documents", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const sessionRequest = new Request("https://example.com/documents/");
    const initial = await handler.fetch(sessionRequest, createInfo());
    const sessionId = getSessionId(initial);

    const kv = await Deno.openKv(kvFilePath(root));
    await kv.set(["documents", "doc-1"], {
      id: "doc-1",
      title: "First document",
      content: "Body",
      created: "2026-01-01T00:00:00",
      updated: "2026-01-01T00:00:00",
      draft: false,
      blocks: [],
    });
    await kv.close();

    const response = await handler.fetch(
      new Request("https://example.com/documents/", {
        headers: {
          cookie: `session=${sessionId}`,
        },
      }),
      createInfo(),
    );

    assertEquals(response.status, 200);
    const page = await response.text();
    assertStringIncludes(page, "First document");
    assertStringIncludes(page, "/document/doc-1/edit/");
  } finally {
    closeTestHandler(root);
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("editing a document shows the document title and form", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/documents/new/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);

    const kv = await Deno.openKv(kvFilePath(root));
    await kv.set(["documents", "doc-2"], {
      id: "doc-2",
      title: "Editable document",
      content: "Some content",
      created: "2026-01-01T00:00:00",
      updated: "2026-01-01T00:00:00",
      draft: true,
      blocks: [],
    });
    await kv.close();

    const response = await handler.fetch(
      new Request("https://example.com/document/doc-2/edit/", {
        headers: {
          cookie: `session=${sessionId}`,
        },
      }),
      createInfo(),
    );

    assertEquals(response.status, 200);
    const page = await response.text();
    assertStringIncludes(page, "Editable document");
    assertStringIncludes(page, "Save Document");
  } finally {
    closeTestHandler(root);
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("missing document id in edit route returns a page with no document", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/documents/new/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);

    const response = await handler.fetch(
      new Request("https://example.com/document//edit/", {
        headers: {
          cookie: `session=${sessionId}`,
        },
      }),
      createInfo(),
    );

    assertEquals(response.status, 404);
  } finally {
    closeTestHandler(root);
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("document blocks can be created for an existing document", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/documents/new/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);

    const kv = await Deno.openKv(kvFilePath(root));
    await kv.set(["documents", "doc-3"], {
      id: "doc-3",
      title: "Block document",
      content: "Body",
      created: "2026-01-01T00:00:00",
      updated: "2026-01-01T00:00:00",
      draft: false,
      blocks: [],
    });
    await kv.close();

    const response = await handler.fetch(
      new Request("https://example.com/document/doc-3/blocks/new/", {
        method: "POST",
        headers: {
          cookie: `session=${sessionId}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ type: "text" }).toString(),
      }),
      createInfo(),
    );

    assertEquals(response.status, 302);
    const location = response.headers.get("location");
    assert(location, "expected a redirect location");
    assertStringIncludes(location, "/document/doc-3/edit/");

    const persist = await Deno.openKv(kvFilePath(root));
    const blockEntries: unknown[] = [];
    for await (const entry of persist.list({ prefix: ["blocks", "doc-3"] })) {
      blockEntries.push(entry.value);
    }
    await persist.close();
    assertEquals(blockEntries.length, 1);
    const block = blockEntries[0] as { type: string };
    assertEquals(block.type, "text");
  } finally {
    closeTestHandler(root);
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("invalid block type is rejected", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/documents/new/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);

    const kv = await Deno.openKv(kvFilePath(root));
    await kv.set(["documents", "doc-4"], {
      id: "doc-4",
      title: "More blocks",
      content: "Body",
      created: "2026-01-01T00:00:00",
      updated: "2026-01-01T00:00:00",
      draft: false,
      blocks: [],
    });
    await kv.close();

    const response = await handler.fetch(
      new Request("https://example.com/document/doc-4/blocks/new/", {
        method: "POST",
        headers: {
          cookie: `session=${sessionId}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ type: "not-a-block" }).toString(),
      }),
      createInfo(),
    );

    assertEquals(response.status, 400);
    const persist = await Deno.openKv(kvFilePath(root));
    const blockEntries: unknown[] = [];
    for await (const entry of persist.list({ prefix: ["blocks", "doc-4"] })) {
      blockEntries.push(entry.value);
    }
    await persist.close();
    assertEquals(blockEntries.length, 0);
  } finally {
    closeTestHandler(root);
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("each supported block has an editor and saves typed content", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/documents/new/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);
    const documentId = "typed-blocks";
    const blocks = [
      {
        id: "heading-1",
        type: "heading",
        order: 0,
        content: { type: "heading", level: 2, text: "Old heading" },
      },
      {
        id: "markdown-1",
        type: "markdown",
        order: 1,
        content: { type: "markdown", body: "Old markdown" },
      },
      {
        id: "text-1",
        type: "text",
        order: 2,
        content: { type: "text", body: "Old text" },
      },
      {
        id: "media-1",
        type: "media",
        order: 3,
        content: { type: "media", url: "", alt: "", caption: "" },
      },
      {
        id: "file-1",
        type: "file",
        order: 4,
        content: { type: "file", url: "", filename: "", size: 0 },
      },
      {
        id: "code-1",
        type: "code",
        order: 5,
        content: { type: "code", body: "Old code" },
      },
    ];
    const kv = await Deno.openKv(kvFilePath(root));
    await kv.set(["documents", documentId], {
      id: documentId,
      title: "Typed blocks",
      content: "",
      created: "2026-01-01",
      updated: "2026-01-01",
      draft: false,
      blocks: [],
    });
    for (const block of blocks) {
      await kv.set(["blocks", documentId, block.id], block);
    }
    await kv.close();

    const editor = await handler.fetch(
      new Request(`https://example.com/document/${documentId}/edit/`, {
        headers: { cookie: `session=${sessionId}` },
      }),
      createInfo(),
    );
    assertEquals(editor.status, 200);
    const page = await editor.text();
    for (
      const type of ["heading", "markdown", "text", "media", "file", "code"]
    ) {
      assertStringIncludes(page, `data-block-type="${type}"`);
    }
    assertStringIncludes(page, "data-block-preview");

    const updates = [
      ["heading-1", { level: "3", text: "Updated heading" }],
      ["markdown-1", { body: "**Updated markdown**" }],
      ["text-1", { body: "Updated text" }],
      [
        "media-1",
        {
          url: "https://example.com/image.png",
          alt: "An image",
          caption: "Image caption",
        },
      ],
      [
        "file-1",
        {
          url: "https://example.com/file.pdf",
          filename: "file.pdf",
          size: "42",
        },
      ],
      ["code-1", { body: "const answer = 42;" }],
    ] as const;
    for (const [blockId, values] of updates) {
      const response = await handler.fetch(
        new Request(
          `https://example.com/document/${documentId}/blocks/${blockId}/update/`,
          {
            method: "POST",
            headers: {
              cookie: `session=${sessionId}`,
              "content-type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(values).toString(),
          },
        ),
        createInfo(),
      );
      assertEquals(response.status, 302);
    }

    const invalidMedia = await handler.fetch(
      new Request(
        `https://example.com/document/${documentId}/blocks/media-1/update/`,
        {
          method: "POST",
          headers: {
            cookie: `session=${sessionId}`,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            url: "javascript:alert(1)",
            alt: "An image",
            caption: "Image caption",
          }).toString(),
        },
      ),
      createInfo(),
    );
    assertEquals(invalidMedia.status, 400);

    const saved = await Deno.openKv(kvFilePath(root));
    const expectedContent = [
      { type: "heading", level: 3, text: "Updated heading" },
      { type: "markdown", body: "**Updated markdown**" },
      { type: "text", body: "Updated text" },
      {
        type: "media",
        url: "https://example.com/image.png",
        alt: "An image",
        caption: "Image caption",
      },
      {
        type: "file",
        url: "https://example.com/file.pdf",
        filename: "file.pdf",
        size: 42,
      },
      { type: "code", body: "const answer = 42;" },
    ];
    for (let index = 0; index < blocks.length; index++) {
      const block = await saved.get<{ content: unknown }>([
        "blocks",
        documentId,
        blocks[index].id,
      ]);
      assertEquals(block.value?.content, expectedContent[index]);
    }
    await saved.close();
  } finally {
    closeTestHandler(root);
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("document metadata and block order and deletion persist", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/documents/new/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);
    const documentId = "ordered-blocks";
    const kv = await Deno.openKv(kvFilePath(root));
    await kv.set(["documents", documentId], {
      id: documentId,
      title: "Original",
      content: "",
      created: "2026-01-01",
      updated: "2026-01-01",
      draft: true,
      blocks: [],
    });
    for (
      const [id, order] of [["first", 0], ["second", 1], ["third", 2]] as const
    ) {
      await kv.set(["blocks", documentId, id], {
        id,
        type: "text",
        order,
        content: { type: "text", body: id },
      });
    }
    await kv.close();

    const savedDocument = await handler.fetch(
      new Request(`https://example.com/document/${documentId}/update/`, {
        method: "POST",
        headers: {
          cookie: `session=${sessionId}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ title: "Updated" }).toString(),
      }),
      createInfo(),
    );
    assertEquals(savedDocument.status, 302);

    const orderForm = new URLSearchParams();
    orderForm.append("order", "third");
    orderForm.append("order", "first");
    orderForm.append("order", "second");
    const reordered = await handler.fetch(
      new Request(
        `https://example.com/document/${documentId}/blocks/order/`,
        {
          method: "POST",
          headers: {
            cookie: `session=${sessionId}`,
            "content-type": "application/x-www-form-urlencoded",
            accept: "application/json",
          },
          body: orderForm.toString(),
        },
      ),
      createInfo(),
    );
    assertEquals(reordered.status, 200);
    assertEquals((await reordered.json()).ok, true);

    const movedWithoutJavaScript = await handler.fetch(
      new Request(
        `https://example.com/document/${documentId}/blocks/order/`,
        {
          method: "POST",
          headers: {
            cookie: `session=${sessionId}`,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            blockId: "second",
            direction: "up",
          }).toString(),
        },
      ),
      createInfo(),
    );
    assertEquals(movedWithoutJavaScript.status, 302);

    const persisted = await Deno.openKv(kvFilePath(root));
    const document = await persisted.get<{ title: string; draft: boolean }>([
      "documents",
      documentId,
    ]);
    assertEquals(document.value?.title, "Updated");
    assertEquals(document.value?.draft, false);
    const ordered = [];
    for await (
      const entry of persisted.list<{ id: string; order: number }>({
        prefix: ["blocks", documentId],
      })
    ) ordered.push(entry.value);
    ordered.sort((a, b) => a.order - b.order);
    assertEquals(ordered.map((block) => block.id), [
      "third",
      "second",
      "first",
    ]);
    await persisted.close();

    const deleted = await handler.fetch(
      new Request(
        `https://example.com/document/${documentId}/blocks/first/delete/`,
        {
          method: "POST",
          headers: { cookie: `session=${sessionId}` },
        },
      ),
      createInfo(),
    );
    assertEquals(deleted.status, 302);
    const verify = await Deno.openKv(kvFilePath(root));
    assertEquals(
      (await verify.get(["blocks", documentId, "first"])).value,
      null,
    );
    await verify.close();
  } finally {
    closeTestHandler(root);
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("markdown preview renders formatting and escapes raw HTML", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/documents/new/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);
    const response = await handler.fetch(
      new Request("https://example.com/document/blocks/markdown-preview/", {
        method: "POST",
        headers: {
          cookie: `session=${sessionId}`,
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
        },
        body: new URLSearchParams({
          body: "# Preview\n\n<script>alert(1)</script>",
        }).toString(),
      }),
      createInfo(),
    );
    assertEquals(response.status, 200);
    const { html } = await response.json();
    assertStringIncludes(html, "<h1>Preview</h1>");
    assertStringIncludes(html, "&lt;script&gt;");
    assertEquals(html.includes("<script>"), false);
  } finally {
    closeTestHandler(root);
    await Deno.remove(root, { recursive: true });
  }
});
