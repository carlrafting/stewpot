import { assertEquals } from "@std/assert";
import { logger } from "./logger.ts";

Deno.test("logger logs the request and the response status", async () => {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.join(" "));
  };

  try {
    const response = await logger(
      new Request("http://localhost/hello", { method: "POST" }),
      () => new Response("created", { status: 201 }),
    );

    assertEquals(response.status, 201);
    assertEquals(await response.text(), "created");
  } finally {
    console.log = original;
  }

  assertEquals(lines, ["--> POST http://localhost/hello", "<-- 201"]);
});
