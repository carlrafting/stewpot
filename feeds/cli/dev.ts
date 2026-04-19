import { join } from "@std/path/join";
import { loadConfig } from "./config.ts";
import { createStorage } from "./storage.ts";
import cli, {
  CONFIG_FILENAME,
  ITEMS_DIRNAME,
  KV_FILENAME,
  type Paths,
  SOURCES_FILENAME,
} from "./main.ts";

interface DevPaths extends Paths {}

async function main() {
  try {
    const tmpDir = import.meta.resolve("../tmp");
    const paths: DevPaths = {
      root: tmpDir,
      sources: join(tmpDir, SOURCES_FILENAME),
      config: join(tmpDir, CONFIG_FILENAME),
      items: join(tmpDir, ITEMS_DIRNAME),
      kv: join(tmpDir, KV_FILENAME),
    };
    console.log({ paths });
    const config = await loadConfig(paths.config);
    const store = await createStorage(config?.storage, paths);
    const code = await cli(Deno.args, config, store, paths);
    if (typeof code === "number") Deno.exit(code);
  } catch (error) {
    throw error;
  }
}

if (import.meta.main) {
  main();
}
