import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { getSetCookies } from "@std/http/cookie";
import csrf, { csrfToken, generateCSRFToken } from "./csrf.ts";

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

function jsonRequest(
  method: string,
  headers: Record<string, string> = {},
): Request {
  return new Request("http://localhost/api", {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: method === "GET" || method === "HEAD" ? undefined : "{}",
  });
}

Deno.test("csrf rejects a JSON POST without a token", async () => {
  let nextCalled = false;
  const middleware = csrf();

  const response = await middleware(
    jsonRequest("POST", { cookie: "csrf_token=abc" }),
    () => {
      nextCalled = true;
      return new Response("ok");
    },
  );

  assertEquals(response.status, 403);
  assertEquals(nextCalled, false);
});

Deno.test("csrf accepts a token sent in the x-csrf-token header", async () => {
  const middleware = csrf();

  const response = await middleware(
    jsonRequest("POST", { cookie: "csrf_token=abc", "x-csrf-token": "abc" }),
    () => new Response("ok"),
  );

  assertEquals(response.status, 200);
});

Deno.test("csrf rejects an x-csrf-token header that does not match", async () => {
  const middleware = csrf();

  const response = await middleware(
    jsonRequest("POST", { cookie: "csrf_token=abc", "x-csrf-token": "nope" }),
    () => new Response("ok"),
  );

  assertEquals(response.status, 403);
});

Deno.test("csrf protects PUT, PATCH and DELETE", async () => {
  const middleware = csrf();

  for (const method of ["PUT", "PATCH", "DELETE"]) {
    const rejected = await middleware(
      jsonRequest(method, { cookie: "csrf_token=abc" }),
      () => new Response("ok"),
    );
    assertEquals(rejected.status, 403, `${method} without a token`);

    const accepted = await middleware(
      jsonRequest(method, { cookie: "csrf_token=abc", "x-csrf-token": "abc" }),
      () => new Response("ok"),
    );
    assertEquals(accepted.status, 200, `${method} with a token`);
  }
});

Deno.test("csrf does not require a token for safe methods", async () => {
  const middleware = csrf();

  for (const method of ["GET", "HEAD", "OPTIONS"]) {
    const response = await middleware(
      jsonRequest(method),
      () => new Response("ok"),
    );
    assertEquals(response.status, 200, method);
  }
});

Deno.test("csrf rejects a request when the cookie is missing", async () => {
  const middleware = csrf();

  const response = await middleware(
    jsonRequest("POST", { "x-csrf-token": "abc" }),
    () => new Response("ok"),
  );

  assertEquals(response.status, 403);
});

Deno.test("csrfToken gives handlers the token on a first request", async () => {
  const middleware = csrf();
  const request = new Request("http://localhost/");
  let seen: string | undefined;

  const response = await middleware(request, () => {
    seen = csrfToken(request);
    return new Response("ok");
  });

  assert(seen, "the handler can read the token before the cookie exists");
  const cookie = getSetCookies(response.headers).find((c) =>
    c.name === "csrf_token"
  );
  assertEquals(cookie?.value, seen, "the cookie carries the same token");
});

Deno.test("csrfToken returns the token from the cookie on later requests", async () => {
  const middleware = csrf();
  const request = new Request("http://localhost/", {
    headers: { cookie: "csrf_token=existing" },
  });
  let seen: string | undefined;

  await middleware(request, () => {
    seen = csrfToken(request);
    return new Response("ok");
  });

  assertEquals(seen, "existing");
});

Deno.test("csrfToken is undefined for a request without a token", () => {
  assertEquals(csrfToken(new Request("http://localhost/")), undefined);
});

Deno.test("a token read from csrfToken is accepted when submitted back", async () => {
  const middleware = csrf();
  const first = new Request("http://localhost/");
  let token: string | undefined;
  await middleware(first, () => {
    token = csrfToken(first);
    return new Response("form");
  });

  const response = await middleware(
    post(`csrf_token=${encodeURIComponent(token!)}`, `csrf_token=${token}`),
    () => new Response("ok"),
  );

  assertEquals(response.status, 200);
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
