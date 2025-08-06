import {
  assertEquals,
} from "jsr:@std/assert";
import { assertSnapshot } from "@std/testing/snapshot";
import simpleRoutes, { defineRoutes, onNotFound } from "./main.ts";
import type { Middleware } from "../middleware/main.ts";

const mockNext = () => new Response("Next called");

Deno.test("simpleRoutes matches GET /", async () => {
  const definitions = defineRoutes([
    {
      method: "GET",
      path: "/",
      handler: () => new Response("Hello Index!"),
    },
  ]);
  const middleware: Middleware = simpleRoutes(definitions);

  const request = new Request("http://localhost/", { method: "GET" });
  const response = await middleware(request, mockNext);

  const text = await response.text();
  assertEquals(text, "Hello Index!");
  assertEquals(response.status, 200);
});

Deno.test("simpleRoutes falls back to next for unmatched route", async () => {
  const definitions = defineRoutes([
    {
      method: "GET",
      path: "/",
      handler: () => new Response("Hello Index!"),
    },
  ]);
  const middleware: Middleware = simpleRoutes(definitions);

  const request = new Request("http://localhost/not-found", { method: "GET" });
  const response = await middleware(request, mockNext);

  const text = await response.text();
  assertEquals(text, "Next called");
  assertEquals(response.status, 200);
});

Deno.test("simpleRoutes returns 404 from onNotFound if next not called", async (t) => {
  const definitions = defineRoutes([
    {
      method: "GET",
      path: "/",
      handler: () => new Response("Hello Index!"),
    },
  ]);
  const middleware: Middleware = simpleRoutes(definitions);

  const request = new Request("http://localhost/not-found", { method: "GET" });
  // Force middleware to NOT call next and instead handle 404 itself
  const finalHandler = (): Promise<Response> | Response => onNotFound(request)
  const response = await middleware(request, finalHandler);

  const text = await response.text();
  await assertSnapshot(t, text);
  assertEquals(response.status, 404);
});

Deno.test("simpleRoutes returns 500 from onError when handler throws", async () => {
  const definitions = defineRoutes([
    {
      method: "GET",
      path: "/error",
      handler: () => {
        throw new Error("fail");
      },
    },
  ]);
  const middleware: Middleware = simpleRoutes(definitions, {
    normalizePath: true,
    onError: (req, error) =>
      new Response(`Error: ${error.message}`, { status: 500 }),
  });

  const request = new Request("http://localhost/error", { method: "GET" });
  const response = await middleware(request, mockNext);

  const text = await response.text();
  assertEquals(text, "Error: fail");
  assertEquals(response.status, 500);
});
