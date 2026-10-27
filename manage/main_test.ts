import { assertEquals, assertStringIncludes } from "@std/assert";
import { toFileUrl } from "@std/path/to-file-url";
import { app } from "./main.ts";

Deno.test("requests without a session receive a new session cookie", async () => {
  const root = await Deno.makeTempDir();
  try {
    const handler = await app({
      meta: { url: toFileUrl(root).href.replace(/\/?$/, "/") },
      sessions: {},
      kv: {},
    });
    const request = new Request("https://example.com/");
    const info: Deno.ServeHandlerInfo = {
      remoteAddr: {
        hostname: "127.0.0.1",
        port: 0,
        transport: "tcp",
      },
      completed: Promise.resolve(),
    };
    const response = await handler.fetch(request, info);

    assertEquals(response.status, 302);
    assertEquals(response.headers.get("location"), request.url);
    assertStringIncludes(response.headers.get("set-cookie") ?? "", "session=");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
