import type { Cookie } from "@std/http/cookie";
import { createSessionCookie } from "./cookie.ts";
import { assert } from "@std/assert/assert";

Deno.test("should create cookie", (t) => {
  const url = new URL("https://localhost:8000");
  const request = new Request(url);
  const id = crypto.randomUUID();
  const cookie: Cookie = createSessionCookie(request, id);
  assert(cookie);
});

Deno.test("should probably do something if id is incorrect", () => {
  const url = new URL("https://localhost:8000");
  const request = new Request(url);
  const id = "just a random string";
  const cookie: Cookie = createSessionCookie(request, id);
  assert(!cookie);
});
