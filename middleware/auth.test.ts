import { assertEquals, assertRejects } from "@std/assert";
import auth from "./auth.ts";

const acceptValid = (value: string) => value === "valid";

function request(path: string, cookie?: string): Request {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  return new Request(`http://localhost${path}`, { headers });
}

Deno.test("auth redirects to the sign-in page without the cookie", async () => {
  let nextCalled = false;
  const middleware = auth({ verify: acceptValid });

  const response = await middleware(request("/private"), () => {
    nextCalled = true;
    return new Response("secret");
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/signin");
  assertEquals(nextCalled, false);
});

Deno.test("auth does not call verify when the cookie is missing", async () => {
  let verifyCalled = false;
  const middleware = auth({
    verify: () => {
      verifyCalled = true;
      return true;
    },
  });

  const response = await middleware(
    request("/private"),
    () => new Response("secret"),
  );

  assertEquals(response.status, 302);
  assertEquals(verifyCalled, false);
});

Deno.test("auth redirects when verify rejects the cookie value", async () => {
  let nextCalled = false;
  const middleware = auth({ verify: acceptValid });

  const response = await middleware(
    request("/private", "authenticated=forged"),
    () => {
      nextCalled = true;
      return new Response("secret");
    },
  );

  assertEquals(response.status, 302);
  assertEquals(nextCalled, false);
});

Deno.test("auth lets requests through when verify accepts the value", async () => {
  const middleware = auth({ verify: acceptValid });

  const response = await middleware(
    request("/private", "authenticated=valid"),
    () => new Response("secret"),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.text(), "secret");
});

Deno.test("auth supports an async verify that receives the request", async () => {
  let seenPath: string | undefined;
  const middleware = auth({
    verify: async (value, req) => {
      seenPath = new URL(req.url).pathname;
      await Promise.resolve();
      return value === "valid";
    },
  });

  const response = await middleware(
    request("/private", "authenticated=valid"),
    () => new Response("secret"),
  );

  assertEquals(response.status, 200);
  assertEquals(seenPath, "/private");
});

Deno.test("auth propagates errors thrown by verify", async () => {
  const middleware = auth({
    verify: () => {
      throw new Error("store unavailable");
    },
  });

  await assertRejects(
    async () =>
      await middleware(
        request("/private", "authenticated=valid"),
        () => new Response("secret"),
      ),
    Error,
    "store unavailable",
  );
});

Deno.test("auth redirect does not echo request headers", async () => {
  const headers = new Headers({
    cookie: "session=secret",
    authorization: "Bearer token",
  });
  const middleware = auth({ verify: acceptValid });

  const response = await middleware(
    new Request("http://localhost/private", { headers }),
    () => new Response("secret"),
  );

  assertEquals(response.headers.get("cookie"), null);
  assertEquals(response.headers.get("authorization"), null);
  assertEquals(response.headers.get("location"), "/signin");
});

Deno.test("auth does not redirect requests to the sign-in page itself", async () => {
  const middleware = auth({ verify: acceptValid });

  const response = await middleware(
    request("/signin"),
    () => new Response("sign in"),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.text(), "sign in");
});

Deno.test("auth honors a custom sign-in path", async () => {
  const middleware = auth({ verify: acceptValid, signin: "/login" });

  const redirected = await middleware(
    request("/private"),
    () => new Response("secret"),
  );
  assertEquals(redirected.status, 302);
  assertEquals(redirected.headers.get("location"), "/login");

  const allowed = await middleware(
    request("/login"),
    () => new Response("log in"),
  );
  assertEquals(allowed.status, 200);
});

Deno.test("auth reads a custom cookie name", async () => {
  const middleware = auth({ verify: acceptValid, cookie: "token" });

  const ignored = await middleware(
    request("/private", "authenticated=valid"),
    () => new Response("secret"),
  );
  assertEquals(ignored.status, 302, "the default cookie name is not read");

  const allowed = await middleware(
    request("/private", "token=valid"),
    () => new Response("secret"),
  );
  assertEquals(allowed.status, 200);
});
