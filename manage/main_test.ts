import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path/join";
import { toFileUrl } from "@std/path/to-file-url";
import { app } from "./main.ts";

async function createTestHandler(
  root: string,
): Promise<Awaited<ReturnType<typeof app>>> {
  const rootUrl = toFileUrl(root).href.replace(/\/?$/, "/");
  const sessionsPath = join(root, "sessions.db");
  const kvPath = join(root, "kv.db");

  const handler = await app({
    meta: { url: rootUrl },
    sessions: { path: sessionsPath },
    kv: { path: kvPath },
  });
  testHandlers.set(root, handler);
  return handler;
}

const testHandlers = new Map<
  string,
  Awaited<ReturnType<typeof createTestHandler>>
>();

async function closeTestHandler(root: string): Promise<void> {
  const handler = testHandlers.get(root);
  if (handler) {
    await handler.close();
    testHandlers.delete(root);
  }
  await Deno.remove(root, { recursive: true });
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
    await closeTestHandler(root);
  }
});

Deno.test("library upload route reports that uploads are not implemented", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/library/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);

    const response = await handler.fetch(
      new Request("https://example.com/library/upload/", {
        method: "POST",
        headers: {
          cookie: `session=${sessionId}`,
        },
      }),
      createInfo(),
    );
    assertEquals(response.status, 501);
    assertStringIncludes(await response.text(), "not available yet");
  } finally {
    await closeTestHandler(root);
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
    await closeTestHandler(root);
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

    const kv = await Deno.openKv(join(root, "kv.db"));
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
    await closeTestHandler(root);
  }
});

Deno.test("documents index displays saved documents", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const sessionRequest = new Request("https://example.com/documents/");
    const initial = await handler.fetch(sessionRequest, createInfo());
    const sessionId = getSessionId(initial);

    const kv = await Deno.openKv(join(root, "kv.db"));
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
    await closeTestHandler(root);
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

    const kv = await Deno.openKv(join(root, "kv.db"));
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
    await closeTestHandler(root);
  }
});

Deno.test("document updates save title and draft state without losing content", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/documents/new/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);

    const kv = await Deno.openKv(join(root, "kv.db"));
    await kv.set(["documents", "doc-update"], {
      id: "doc-update",
      title: "Before",
      content: "Keep this content",
      created: "2026-01-01T00:00:00",
      updated: "2026-01-01T00:00:00",
      draft: false,
      blocks: [],
    });
    await kv.close();

    const response = await handler.fetch(
      new Request("https://example.com/document/doc-update/update/", {
        method: "POST",
        headers: {
          cookie: `session=${sessionId}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ title: "Updated title", draft: "on" }),
      }),
      createInfo(),
    );

    assertEquals(response.status, 302);
    assertEquals(
      response.headers.get("location"),
      "https://example.com/document/doc-update/edit/",
    );

    const persisted = await Deno.openKv(join(root, "kv.db"));
    const document = await persisted.get<{
      title: string;
      content: string;
      draft: boolean;
      updated: string;
    }>(["documents", "doc-update"]);
    assertEquals(document.value?.title, "Updated title");
    assertEquals(document.value?.content, "Keep this content");
    assertEquals(document.value?.draft, true);
    assert(document.value?.updated !== "2026-01-01T00:00:00");
    await persisted.close();
  } finally {
    await closeTestHandler(root);
  }
});

Deno.test("document update rejects a missing title", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/documents/new/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);
    const kv = await Deno.openKv(join(root, "kv.db"));
    await kv.set(["documents", "doc-1"], {
      id: "doc-1",
      title: "Existing document",
      content: "Body",
      created: "2026-01-01T00:00:00",
      updated: "2026-01-01T00:00:00",
      draft: false,
      blocks: [],
    });
    await kv.close();

    const response = await handler.fetch(
      new Request("https://example.com/document/doc-1/update/", {
        method: "POST",
        headers: {
          cookie: `session=${sessionId}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ title: " " }),
      }),
      createInfo(),
    );
    assertEquals(response.status, 400);
  } finally {
    await closeTestHandler(root);
  }
});

Deno.test("document update rejects an unknown document id", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/documents/new/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);

    const response = await handler.fetch(
      new Request("https://example.com/document/missing/update/", {
        method: "POST",
        headers: {
          cookie: `session=${sessionId}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ title: "Title" }),
      }),
      createInfo(),
    );
    assertEquals(response.status, 404);
  } finally {
    await closeTestHandler(root);
  }
});

Deno.test("editing an unknown document returns 404", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/documents/new/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);

    const response = await handler.fetch(
      new Request("https://example.com/document/missing/edit/", {
        headers: {
          cookie: `session=${sessionId}`,
        },
      }),
      createInfo(),
    );

    assertEquals(response.status, 404);
  } finally {
    await closeTestHandler(root);
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

    const kv = await Deno.openKv(join(root, "kv.db"));
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

    const persist = await Deno.openKv(join(root, "kv.db"));
    const blockEntries: unknown[] = [];
    for await (const entry of persist.list({ prefix: ["blocks", "doc-3"] })) {
      blockEntries.push(entry.value);
    }
    await persist.close();
    assertEquals(blockEntries.length, 1);
    const block = blockEntries[0] as { type: string };
    assertEquals(block.type, "text");
  } finally {
    await closeTestHandler(root);
  }
});

Deno.test("invalid block types are rejected", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/documents/new/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);

    const kv = await Deno.openKv(join(root, "kv.db"));
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
        body: new URLSearchParams({ type: "bogus" }).toString(),
      }),
      createInfo(),
    );

    assertEquals(response.status, 400);
    const persist = await Deno.openKv(join(root, "kv.db"));
    const blocks: unknown[] = [];
    for await (const entry of persist.list({ prefix: ["blocks", "doc-4"] })) {
      blocks.push(entry.value);
    }
    await persist.close();
    assertEquals(blocks.length, 0);
  } finally {
    await closeTestHandler(root);
  }
});

Deno.test("blocks cannot be created for an unknown document", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/documents/new/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);

    const response = await handler.fetch(
      new Request("https://example.com/document/missing/blocks/new/", {
        method: "POST",
        headers: {
          cookie: `session=${sessionId}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ type: "text" }),
      }),
      createInfo(),
    );
    assertEquals(response.status, 404);
  } finally {
    await closeTestHandler(root);
  }
});
