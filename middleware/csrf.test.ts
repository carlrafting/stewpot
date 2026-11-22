import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { getSetCookies } from "@std/http/cookie";
import csrf, { generateCSRFToken } from "./csrf.ts";

function post(body: string, cookie?: string): Request {
  const headers = new Headers({
    "content-type": "application/x-www-form-urlencoded",
  });
  if (cookie) headers.set("cookie", cookie);
  return new Request("http://localhost/form", {
    method: "POST",
    headers,
    body,
  });
}

Deno.test("generateCSRFToken returns a unique base64 token", () => {
  const first = generateCSRFToken();
  const second = generateCSRFToken();

  assertNotEquals(first, second);
  assertEquals(atob(first).length, 32);
  assertEquals(atob(generateCSRFToken(16)).length, 16);
});

Deno.test("csrf sets a token cookie when the request has none", async () => {
  const middleware = csrf();

  const response = await middleware(
    new Request("http://localhost/"),
    () => new Response("ok"),
  );

  const cookie = getSetCookies(response.headers).find((c) =>
    c.name === "csrf_token"
  );
  assert(cookie, "csrf_token cookie is set");
  assertEquals(cookie.httpOnly, true);
  assertEquals(cookie.sameSite, "Strict");
});

Deno.test("csrf keeps the existing token cookie", async () => {
  const middleware = csrf();

  const response = await middleware(
    new Request("http://localhost/", {
      headers: { cookie: "csrf_token=existing" },
    }),
    () => new Response("ok"),
  );

  assertEquals(getSetCookies(response.headers).length, 0);
});

Deno.test("csrf rejects a form POST without a token", async () => {
  let nextCalled = false;
  const middleware = csrf();

  const response = await middleware(post("name=a"), () => {
    nextCalled = true;
    return new Response("ok");
  });

  assertEquals(response.status, 403);
  assertEquals(nextCalled, false);
});

Deno.test("csrf rejects a form POST whose token does not match the cookie", async () => {
  const middleware = csrf();

  const response = await middleware(
    post("csrf_token=wrong", "csrf_token=right"),
    () => new Response("ok"),
  );

  assertEquals(response.status, 403);
});

Deno.test("csrf accepts a form POST whose token matches the cookie", async () => {
  const middleware = csrf();

  const response = await middleware(
    post("csrf_token=abc", "csrf_token=abc"),
    () => new Response("ok"),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.text(), "ok");
});

Deno.test("csrf responds 400 to a malformed multipart POST", async () => {
  const middleware = csrf();
  const request = new Request("http://localhost/form", {
    method: "POST",
    headers: {
      "content-type": "multipart/form-data",
      cookie: "csrf_token=abc",
    },
    body: "not multipart",
  });

  const response = await middleware(request, () => new Response("ok"));

  assertEquals(response.status, 400);
});
