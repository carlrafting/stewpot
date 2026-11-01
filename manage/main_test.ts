import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { toFileUrl } from "@std/path/to-file-url";
import { app } from "./main.ts";

function createTestHandler(root: string) {
  const rootUrl = toFileUrl(root).href.replace(/\/?$/, "/");
  const sessionsPath = new URL("sessions.db", rootUrl).pathname;
  const kvPath = new URL("kv.db", rootUrl).pathname;

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

    const kv = await Deno.openKv(new URL("kv.db", toFileUrl(root).href).pathname);
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
