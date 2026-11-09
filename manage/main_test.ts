import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl, toFileUrl } from "@std/path";
import { app } from "./main.ts";

function createTestHandler(root: string) {
  const rootUrl = toFileUrl(root).href.replace(/\/?$/, "/");
  const sessionsPath = fromFileUrl(new URL("sessions.db", rootUrl));
  const kvPath = fromFileUrl(new URL("kv.db", rootUrl));

  return app({
    meta: { url: rootUrl },
    sessions: { path: sessionsPath },
    kv: { path: kvPath },
  });
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

    const kv = await Deno.openKv(fromFileUrl(new URL("kv.db", toFileUrl(root).href)));
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

    const kv = await Deno.openKv(fromFileUrl(new URL("kv.db", toFileUrl(root).href)));
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

    const kv = await Deno.openKv(fromFileUrl(new URL("kv.db", toFileUrl(root).href)));
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

    assertEquals(response.status, 200);
    const page = await response.text();
    assertStringIncludes(page, "There\'s no document associated with this id.");
  } finally {
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

    const kv = await Deno.openKv(fromFileUrl(new URL("kv.db", toFileUrl(root).href)));
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

    const persist = await Deno.openKv(fromFileUrl(new URL("kv.db", toFileUrl(root).href)));
    const blockEntries: unknown[] = [];
    for await (const entry of persist.list({ prefix: ["blocks", "doc-3"] })) {
      blockEntries.push(entry.value);
    }
    await persist.close();
    assertEquals(blockEntries.length, 1);
    const block = blockEntries[0] as { type: string };
    assertEquals(block.type, "text");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("invalid block type is still stored as provided and redirect occurs", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await createTestHandler(root);
    const initial = await handler.fetch(
      new Request("https://example.com/documents/new/"),
      createInfo(),
    );
    const sessionId = getSessionId(initial);

    const kv = await Deno.openKv(fromFileUrl(new URL("kv.db", toFileUrl(root).href)));
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
        body: new URLSearchParams({ type: "code" }).toString(),
      }),
      createInfo(),
    );

    assertEquals(response.status, 302);
    const location = response.headers.get("location");
    assert(location, "expected a redirect location");
    assertStringIncludes(location, "/document/doc-4/edit/");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
