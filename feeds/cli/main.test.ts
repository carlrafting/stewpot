import { assertEquals, assertExists, assertGreater } from "@std/assert";
import { fromFileUrl } from "@std/path/from-file-url";
import { join } from "@std/path/join";
import { assertSnapshot } from "@std/testing/snapshot";
import {
  CONFIG_FILENAME,
  findFeedByUrl,
  removeFeedByUrl,
  resolveFeedInput,
} from "./main.ts";
import { detectMode, run } from "@stewpot/cli";
import { loadConfig } from "../core/config.ts";
import type { FeedData } from "../core/main.ts";

const cliPath = fromFileUrl(new URL("./main.ts", import.meta.url));

Deno.test("detectMode treats modules in a local Git checkout as development", () => {
  assertEquals(detectMode(), "development");
});

Deno.test("init writes the default config file", async () => {
  const root = await Deno.makeTempDir();
  const result = await run(["init"], cliPath, {
    env: { STEWPOT_DIR_OVERRIDE: root },
  }).output();

  assertEquals(result.success, true, new TextDecoder().decode(result.stderr));
  const config = await Deno.readTextFile(join(root, CONFIG_FILENAME));
  assertEquals(config.includes("404 Not Found"), false);
  assertEquals(config.includes('storage: { type: "fs" }'), true);
});

Deno.test("init repairs the config file created by the previous 404 bug", async () => {
  const root = await Deno.makeTempDir();
  await Deno.writeTextFile(join(root, CONFIG_FILENAME), "404 Not Found");
  const result = await run(["init"], cliPath, {
    env: { STEWPOT_DIR_OVERRIDE: root },
  }).output();

  assertEquals(result.success, true, new TextDecoder().decode(result.stderr));
  const config = await Deno.readTextFile(join(root, CONFIG_FILENAME));
  assertEquals(config.includes("404 Not Found"), false);
  assertEquals(config.includes('storage: { type: "fs" }'), true);
});

Deno.test("detectMode treats installed modules outside a Git checkout as production", async () => {
  const cwd = await Deno.makeTempDir();
  const scriptPath = join(cwd, "detect-mode.ts");
  const sharedCliURL = new URL("../../cli/main.ts", import.meta.url);
  const cliConfigPath = fromFileUrl(
    new URL("../../cli/deno.json", import.meta.url),
  );
  await Deno.writeTextFile(
    scriptPath,
    `import { detectMode } from "${sharedCliURL.href}";\nconsole.log(detectMode());\n`,
  );

  const result = await new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", "-c", cliConfigPath, scriptPath],
    cwd,
    env: { STEWPOT_MODE: "auto" },
    stdout: "piped",
    stderr: "piped",
  }).output();

  assertEquals(result.success, true, new TextDecoder().decode(result.stderr));
  assertEquals(new TextDecoder().decode(result.stdout).trim(), "production");
});

const sampleFeeds: FeedData[] = [
  {
    id: "feed-1",
    url: "https://example.com/feed.xml",
    format: "rss",
    fetch_timestamp: "2024-01-01T00:00:00Z",
  },
  {
    id: "feed-2",
    url: "https://example.org/feed.json",
    format: "json",
    fetch_timestamp: "2024-01-02T00:00:00Z",
  },
];

Deno.test("should load config file it exists", async (t) => {
  await t.step("exists", async () => {
    const tempDir = await Deno.makeTempDir();
    const path = join(tempDir, CONFIG_FILENAME);
    await Deno.writeTextFile(path, "");
    const results = await loadConfig(path);
    await assertSnapshot(t, results);
  });

  await t.step("notexists", async () => {
    const path = undefined;
    const results = await loadConfig(path);
    assertEquals(results, { storage: { type: "fs" } });
  });
});

Deno.test(
  "listCommand should list feed sources if there are more than 0",
  async () => {
    const root = await Deno.makeTempDir();
    await Deno.writeTextFile(
      join(root, "sources.json"),
      JSON.stringify(sampleFeeds),
    );
    const args = ["list"];
    const command = run(args, cliPath, {
      env: { STEWPOT_DIR_OVERRIDE: root },
    });
    const results = await command.output();
    assertEquals(results.success, true);
    assertEquals(results.code, 0);
    assertGreater(results.stdout.length, 0);
  },
);

Deno.test("resolveFeedInput adds https scheme for bare hostnames", () => {
  const url = resolveFeedInput("example.com/feed.xml");
  assertExists(url);
  assertEquals(url?.href, "https://example.com/feed.xml");
});

Deno.test("findFeedByUrl matches both exact and hostname-based feed identifiers", () => {
  const byHref = findFeedByUrl(
    sampleFeeds,
    new URL("https://example.com/feed.xml"),
  );
  const byHostname = findFeedByUrl(
    sampleFeeds,
    new URL("https://example.com/"),
  );
  const missing = findFeedByUrl(
    sampleFeeds,
    new URL("https://missing.example/feed.xml"),
  );

  assertEquals(byHref?.id, "feed-1");
  assertEquals(byHostname?.id, "feed-1");
  assertEquals(missing, undefined);
});

Deno.test("removeFeedByUrl removes the matching subscription without altering others", () => {
  const updated = removeFeedByUrl(sampleFeeds, "https://example.org/feed.json");
  assertEquals(updated.length, 1);
  assertEquals(updated[0].id, "feed-1");
});
