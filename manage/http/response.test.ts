import { assertEquals } from "@std/assert/equals";
import { html, json, notFound, text } from "./response.ts";

Deno.test("notFound should return response status 404", async () => {
  const response: Response = notFound("Not Found");
  const text = await response.text();
  assertEquals(response.status, 404);
  assertEquals(text, "Not Found");
});

Deno.test("response helpers should set correct content-type", async (t) => {
  await t.step("html", () => {
    const response: Response = html("");
    const contentType = response.headers.get("content-type");
    assertEquals(contentType, "text/html; charset=utf-8");
  });
  await t.step("json", () => {
    const response: Response = json([]);
    const contentType = response.headers.get("content-type");
    assertEquals(contentType, "application/json; charset=utf-8");
  });
  await t.step("text", () => {
    const response: Response = text("");
    const contentType = response.headers.get("content-type");
    assertEquals(contentType, "text/plain; charset=utf-8");
  });
});
