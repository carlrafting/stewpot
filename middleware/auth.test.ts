import { assertEquals } from "@std/assert";
import auth from "./auth.ts";

function request(path: string, cookie?: string): Request {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  return new Request(`http://localhost${path}`, { headers });
}

Deno.test("auth redirects to the sign-in page without the cookie", async () => {
  let nextCalled = false;
  const middleware = auth();

  const response = await middleware(request("/private"), () => {
    nextCalled = true;
    return new Response("secret");
  });

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("location"), "/signin");
  assertEquals(nextCalled, false);
});

Deno.test("auth lets requests with the cookie through", async () => {
  const middleware = auth();

  const response = await middleware(
    request("/private", "authenticated=1"),
    () => new Response("secret"),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.text(), "secret");
});

Deno.test("auth does not redirect requests to the sign-in page itself", async () => {
  const middleware = auth();

  const response = await middleware(
    request("/signin"),
    () => new Response("sign in"),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.text(), "sign in");
});

Deno.test("auth honors a custom sign-in path", async () => {
  const middleware = auth({ signin: "/login" });

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
