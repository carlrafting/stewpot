import { type Options, serveStaticMiddleware } from "./static.ts";
import { assertEquals } from "@std/assert/equals";

Deno.test({
  name: "serves static file when it exists",
  async fn() {
    const root = await Deno.makeTempDir();
    const fileName = "hello.txt"
    const textFilePath = `${root}/${fileName}`;
    const options: Options = {
      path: root
    };

    await Deno.writeTextFile(
      textFilePath,
      "hello world",
    );

    const middleware = serveStaticMiddleware(options);
    const request = new Request("http://localhost/" + fileName);
    const response = await middleware(request, () =>
      new Response("ok", {
        status: 200
      })
    );
    assertEquals(response.status, 200, "response returns correct http status");
    assertEquals(response.ok, true, "response is ok");
    assertEquals(await response.text(), "hello world");
  }
});

Deno.test({
  name: "falls through to next when file does not exist",
  async fn() {
    const root = await Deno.makeTempDir();
    let nextCalled = false;

    const middleware = serveStaticMiddleware({ path: root });

    const response = await middleware(
      new Request("http://localhost/missing.txt"),
      () => {
        nextCalled = true;
        return new Response("next", { status: 200 });
      },
    );

    assertEquals(nextCalled, true);
    assertEquals(response.status, 200, "response returns correct http status");
    assertEquals(response.ok, true, "response is ok");
    assertEquals(await response.text(), "next");
  }
});
