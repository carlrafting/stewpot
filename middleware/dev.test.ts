import { assert, assertEquals } from "@std/assert";
import devReload, { type DevReloadMiddleware } from "./dev.ts";

async function withMiddleware(
  fn: (middleware: DevReloadMiddleware) => Promise<void>,
): Promise<void> {
  const watched = await Deno.makeTempDir();
  const middleware = devReload({ watchPaths: [watched] });
  try {
    await fn(middleware);
  } finally {
    middleware.close();
  }
}

function html(body: string, headers: HeadersInit = {}): Response {
  return new Response(body, {
    headers: { "content-type": "text/html", ...headers },
  });
}

Deno.test("devReload injects the reload script before </body>", async () => {
  await withMiddleware(async (middleware) => {
    const response = await middleware(
      new Request("http://localhost/"),
      () => html("<html><body>hi</body></html>"),
    );
    const text = await response.text();

    assert(text.includes("new WebSocket"));
    assert(text.indexOf("<script>") < text.indexOf("</body>"));
    assert(text.startsWith("<html><body>hi"));
  });
});

Deno.test("devReload appends the script when there is no </body>", async () => {
  await withMiddleware(async (middleware) => {
    const response = await middleware(
      new Request("http://localhost/"),
      () => html("<p>fragment</p>"),
    );
    const text = await response.text();

    assert(text.startsWith("<p>fragment</p>"));
    assert(text.includes("new WebSocket"));
  });
});

Deno.test("devReload drops the stale content-length of injected pages", async () => {
  await withMiddleware(async (middleware) => {
    const body = "<html><body>hi</body></html>";
    const response = await middleware(
      new Request("http://localhost/"),
      () => html(body, { "content-length": String(body.length) }),
    );

    assertEquals(response.headers.get("content-length"), null);
    assertEquals(response.headers.get("content-type"), "text/html");
    assert((await response.text()).length > body.length);
  });
});

Deno.test("devReload leaves non-HTML responses untouched", async () => {
  await withMiddleware(async (middleware) => {
    const response = await middleware(
      new Request("http://localhost/data"),
      () =>
        new Response('{"ok":true}', {
          headers: {
            "content-type": "application/json",
            "content-length": "11",
          },
        }),
    );

    assertEquals(await response.text(), '{"ok":true}');
    assertEquals(response.headers.get("content-length"), "11");
  });
});

Deno.test("devReload close can be called more than once", async () => {
  const watched = await Deno.makeTempDir();
  const middleware = devReload({ watchPaths: [watched] });

  middleware.close();
  middleware.close();
});

Deno.test("devReload throws for a watched path that does not exist", () => {
  let error: unknown;
  try {
    devReload({ watchPaths: ["/this/path/does/not/exist"] }).close();
  } catch (e) {
    error = e;
  }
  assert(error instanceof Deno.errors.NotFound);
});
