import { assertEquals, assertGreater } from "@std/assert";
import { join } from "@std/path/join";
import { assertSnapshot } from "@std/testing/snapshot";
import { CONFIG_FILENAME } from "./cli.ts";
import { loadConfig } from "./config.ts";

function run(args: string[], options: Deno.CommandOptions = {}) {
  return new Deno.Command(Deno.execPath(), {
    args: ["run", "-RWNE", "cli.ts", ...args],
    ...options,
  });
}

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

Deno.test("should load config file it exists", async (t) => {
  await t.step("exists", async () => {
    const tempDir = await Deno.makeTempDir();
    const path = join(tempDir, CONFIG_FILENAME);
    await Deno.writeTextFile(path, "");
    const results = await loadConfig(path);
    await assertSnapshot(t, results);
  });
  await t.step("notexists", async (t) => {
    const tempDir = await Deno.makeTempDir();
    const path = join(tempDir, CONFIG_FILENAME);
    const results = await loadConfig(path);
    await assertSnapshot(t, results);
  });
});
