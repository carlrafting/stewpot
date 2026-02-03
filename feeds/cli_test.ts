import { assertEquals, assertRejects } from "@std/assert";
import { CommandError, main } from "./cli.ts";

Deno.test("feeds list exits with 0", async () => {
  const code = await main(["list"]);
  assertEquals(code, 0);
});

Deno.test("unknown subcommand throws a CommandError", async () => {
  await assertRejects(async () => main(["wat"]), CommandError);
});
