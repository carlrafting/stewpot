import { assertEquals, assertGreater, assertRejects } from "@std/assert";
import { CommandError, main, type Paths } from "./cli.ts";
import { FilePersistence } from "@stewpot/feeds";

function run(args: string[], options: Deno.CommandOptions = {}) {
  return new Deno.Command(Deno.execPath(), {
    args: ["run", "-RWNE", "cli.ts", ...args],
    ...options,
  });
}

let paths: Paths;
let store: FilePersistence;

Deno.test.beforeAll(async () => {
  paths = {
    root: await Deno.makeTempDir(),
    sources: await Deno.makeTempFile(),
  };

  store = new FilePersistence(paths);
});

Deno.test("no arguments should display help and exit with 0", async () => {
  const code = await main([], store);
  assertEquals(code, 0);
});

Deno.test("unknown subcommand throws a CommandError", async () => {
  await assertRejects(async () => await main(["wat"], store), CommandError);
});

Deno.test(
  "listCommand should list feed sources if there are more than 0",
  async () => {
    const args = ["list"];
    const command = run(args);
    const results = await command.output();
    assertEquals(results.success, true);
    assertEquals(results.code, 0);
    assertGreater(results.stdout.length, 0);
  },
);
