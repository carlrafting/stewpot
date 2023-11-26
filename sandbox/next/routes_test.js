import {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertExists,
  assertMatch,
  assertNotEquals,
  assertNotMatch,
  assertThrows,
} from "../../deps/dev.js";
import { add, clear, match } from "./routes.js";
import { noop } from "./http.js";

clear();

Deno.test("configure", async (t) => {
  await t.step("should do this", () => {
    assertEquals("foo", "foo");
  });
});

Deno.test("add", async (t) => {
  await t.step("should add routes successfully", (t) => {
    add("get", "/", noop);
    add("get", "/foo", noop);
    add("post", "/foo", noop);
    add("get", "/posts/:id", noop);
    assertEquals(map.size, 4);
  });
});

Deno.test("match", async (t) => {
  await t.step("should find the route", () => {
    const results = match("get", "/");
    assert(results.handlers);
    assert(results.params);
    assertEquals(results.handlers.size, 1);
    assertExists(results.params);
  });
});
