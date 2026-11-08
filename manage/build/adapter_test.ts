import { assertStringIncludes } from "@std/assert";
import { join } from "@std/path/join";
import { lumeBuildAdapter } from "./adapter.ts";

Deno.test("Lume adapter runs the configured project task and forwards output", async () => {
  const projectRoot = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      join(projectRoot, "deno.json"),
      JSON.stringify({ tasks: { lume: "deno run build.ts" } }),
    );
    await Deno.writeTextFile(
      join(projectRoot, "build.ts"),
      'console.log("Fixture build output");',
    );
    let output = "";
    await lumeBuildAdapter.build({
      projectRoot,
      documents: [],
      documentsDirectory: projectRoot,
      signal: new AbortController().signal,
      write(chunk) {
        output += chunk;
      },
    });
    assertStringIncludes(output, "Fixture build output");
  } finally {
    await Deno.remove(projectRoot, { recursive: true });
  }
});
