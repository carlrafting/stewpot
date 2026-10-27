import type { Cookie } from "@std/http/cookie";
import { createSessionCookie } from "./cookie.ts";
import { assert } from "@std/assert/assert";
import { assertEquals } from "@std/assert/equals";

Deno.test("should create cookie", (t) => {
  const url = new URL("https://localhost:8000");
  const request = new Request(url);
  const id = crypto.randomUUID();
  const cookie: Cookie = createSessionCookie(request, id);
  assert(cookie);
});

Deno.test("should preserve the provided session ID", () => {
  const url = new URL("https://localhost:8000");
  const request = new Request(url);
  const id = "just a random string";
  const cookie: Cookie = createSessionCookie(request, id);
  assertEquals(cookie.value, id);
});
