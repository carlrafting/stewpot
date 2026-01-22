import { assertEquals, assertRejects } from "@std/assert";
import { CommandError, main } from "./main.ts";

Deno.test("feeds list exits with 0", () => {
  const code = main(["list"]);
  assertEquals(code, 0);
});

Deno.test("unknown subcommand throws a CommandError", async () => {
  await assertRejects(async () => main(["wat"]), CommandError);
});
