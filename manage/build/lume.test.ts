import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { lumeAdapter } from "./lume.ts";
import { BuildWorkspaceError } from "./workspace.ts";

Deno.test("Lume inspection identifies its config and lists output without running it", async () => {
  const root = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      join(root, "_config.ts"),
      'import lume from "lume/mod.ts";\nexport default lume();\n',
    );
    await Deno.mkdir(join(root, "_site"));
    await Deno.writeTextFile(
      join(root, "_site", "index.html"),
      "<h1>Home</h1>",
    );

    const inspection = await lumeAdapter.inspect(root, "_site");

    assertEquals(inspection.projectDetected, true);
    assertEquals(inspection.configFiles, ["_config.ts"]);
    assertEquals(inspection.checks, [{
      label: "Lume import reference found",
      value: "yes",
    }]);
    assertEquals(inspection.outputExists, true);
    assertEquals(inspection.outputIsDirectory, true);
    assertEquals(inspection.outputEntries, [{
      name: "index.html",
      isDirectory: false,
    }]);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("Lume inspection rejects output paths outside the site", async () => {
  const root = await Deno.makeTempDir();
  try {
    await assertRejects(
      () => lumeAdapter.inspect(root, "../outside"),
      BuildWorkspaceError,
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
