import {
  assertSnapshot,
} from "https://deno.land/std@0.201.0/testing/snapshot.ts";
import {
  assertSpyCall,
  assertSpyCalls,
  spy,
} from "https://deno.land/std@0.201.0/testing/mock.ts";
import {
  checkType,
  createTemplateRenderer,
  logNotFound,
  send,
} from "./stewpot.js";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.201.0/assert/mod.ts";

Deno.test("checkType", async (t) => {
  await t.step("should handle several common objects", () => {
    assertEquals(checkType([]), "array");
    assertEquals(checkType({}), "object");
    assertEquals(checkType(null), "null");
    assertEquals(checkType(undefined), "undefined");
    assertEquals(checkType(new Map()), "map");
    assertEquals(checkType(new Set()), "set");
    // assertEquals(checkType(new Promise()), "promise");
    assertEquals(checkType(1), "number");
    assertEquals(checkType("hello world"), "string");
    assertEquals(checkType(true), "boolean");
  });
});

Deno.test("createTemplateRenderer", { ignore: true }, async (t) => {
  await t.step("should work", async () => {
    const render = createTemplateRenderer();
    const template = await render();
    assert(template());
  });
});

Deno.test("send", async (t) => {
  await t.step("should work with default parameters", () => {
    const res = send();
    assert(res);
    assert(res.ok);
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("content-type"), "text/html");
  });
});

Deno.test("logNoutFound", async (t) => {
  await t.step("should work", async (t) => {
    const url = new URL("http://localhost");
    const req = new Request(url);
    const err = new Deno.errors.NotFound();
    const logNotFoundSpy = spy(logNotFound);
    logNotFoundSpy(req, err, "/");
    assertSpyCalls(logNotFoundSpy, 1);
    await assertSnapshot(t, "GET / 404");
  });
});
