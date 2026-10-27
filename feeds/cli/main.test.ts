import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path/join";
import { assertSnapshot } from "@std/testing/snapshot";
import { CONFIG_FILENAME } from "./main.ts";
import { loadConfig } from "../core/config.ts";

Deno.test(
  "list command prints subscribed feed sources",
  async () => {
    const root = await Deno.makeTempDir();
    try {
      await Deno.writeTextFile(
        join(root, CONFIG_FILENAME),
        'export default { storage: { type: "fs" } };',
      );
      await Deno.writeTextFile(
        join(root, "sources.json"),
        JSON.stringify([{
          id: "feed-1",
          url: "https://example.com/feed.xml",
          format: "rss",
        }]),
      );

      const results = await new Deno.Command(Deno.execPath(), {
        args: ["-P", import.meta.resolve("./main.ts"), "list"],
        env: { STEWPOT_DIR_OVERRIDE: root },
      }).output();
      assertEquals(results.success, true);
      assertEquals(results.code, 0);
      assertStringIncludes(
        new TextDecoder().decode(results.stdout),
        "example.com",
      );
    } finally {
      await Deno.remove(root, { recursive: true });
    }
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
    const path = undefined;
    const results = await loadConfig(path);
    await assertSnapshot(t, results);
  });
});
