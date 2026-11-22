import { assert, assertEquals } from "@std/assert";
import devReload from "./dev.ts";

// devReload starts a file watcher that cannot be stopped, so these tests opt out
// of the resource and op sanitizers.
const options = { sanitizeResources: false, sanitizeOps: false };

async function middlewareFor(): Promise<ReturnType<typeof devReload>> {
  const watched = await Deno.makeTempDir();
  return devReload({ watchPaths: [watched] });
}

function html(body: string): Response {
  return new Response(body, { headers: { "content-type": "text/html" } });
}

Deno.test({
  name: "devReload injects the reload script before </body>",
  ...options,
  async fn() {
    const middleware = await middlewareFor();

    const response = await middleware(
      new Request("http://localhost/"),
      () => html("<html><body>hi</body></html>"),
    );
    const text = await response.text();

    assert(text.includes("new WebSocket"));
    assert(text.indexOf("<script>") < text.indexOf("</body>"));
    assert(text.startsWith("<html><body>hi"));
  },
});

Deno.test({
  name: "devReload appends the script when there is no </body>",
  ...options,
  async fn() {
    const middleware = await middlewareFor();

    const response = await middleware(
      new Request("http://localhost/"),
      () => html("<p>fragment</p>"),
    );
    const text = await response.text();

    assert(text.startsWith("<p>fragment</p>"));
    assert(text.includes("new WebSocket"));
  },
});

Deno.test({
  name: "devReload leaves non-HTML responses untouched",
  ...options,
  async fn() {
    const middleware = await middlewareFor();

    const response = await middleware(
      new Request("http://localhost/data"),
      () =>
        new Response('{"ok":true}', {
          headers: { "content-type": "application/json" },
        }),
    );

    assertEquals(await response.text(), '{"ok":true}');
  },
});
