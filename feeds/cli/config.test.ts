import {
  assert,
  assertEquals,
  assertGreater,
  assertGreaterOrEqual,
} from "@std/assert";
import { defineConfig, loadConfig, writeConfigToPath } from "./config.ts";

function setup() {
  return defineConfig({
    reader: {
      hostname: "0.0.0.0",
      port: 8080,
    },
    storage: { type: "fs" },
  });
}

Deno.test("define", (t) => {
  const config = setup();
  assertEquals(config.reader?.hostname, "0.0.0.0");
  assertEquals(config.reader?.port, 8080);
  assertEquals(config.storage?.type, "fs");
});

Deno.test("load", async () => {
  const config = setup();
  assertEquals(config, {
    reader: {
      hostname: "0.0.0.0",
      port: 8080,
    },
    storage: { type: "fs" },
  });
  const tmp = await Deno.makeTempFile();
  assert(tmp, "creates tmp file");
  await Deno.writeTextFile(tmp, `${config}`);
  const file = await loadConfig(tmp);
  assert(file, "loading config file was successful");
});

Deno.test("write", async () => {
  const tmp = await Deno.makeTempFile();
  assert(tmp, "creates tmp file");
  await writeConfigToPath(tmp, "../assets/config.default.ts");
  const info = await Deno.stat(tmp);
  assertGreater(info.size, 0);
  const actual = await Deno.readTextFile(tmp);
  assertGreater(actual.length, 0);
});
