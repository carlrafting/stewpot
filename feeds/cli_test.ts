import { assertEquals, assertGreater, assertRejects } from "@std/assert";
import { CommandError, main } from "./cli.ts";

function run(args: string[]) {
  return new Deno.Command("deno", {
    args: ["run", "-RWN", "cli.ts", ...args],
  });
}

Deno.test("feeds list exits with 0", async () => {
  const code = await main(["list"]);
  assertEquals(code, 0);
});

Deno.test("unknown subcommand throws a CommandError", async () => {
  await assertRejects(async () => main(["wat"]), CommandError);
});

Deno.test("listCommand should list feed sources if there are more than 0", async () => {
  const args = ["list"];
  const command = run(args);
  const results = await command.output();
  assertEquals(results.success, true);
  assertEquals(results.code, 0);
  assertGreater(results.stdout.length, 0);
});
