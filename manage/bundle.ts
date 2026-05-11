import { join } from "@std/path";

const vendors = [
  "https://cdn.jsdelivr.net/gh/ventojs/vento@2.3.1/mod.ts",
];

await bundle(vendors);

async function bundle(vendors: string[]) {
  console.log("[bundle]", "creating bundle for https entrypoints...");

  for (const entrypoint of vendors) {
    const url = new URL(entrypoint);
    console.log({ url });
    const entrypoints = [
      url.href,
    ];
    const splitPath = url.pathname.split("/");
    console.log({ splitPath, entrypoints });
    const result = await Deno.bundle({
      entrypoints,
      outputPath: join("vendor", ...splitPath),
      write: false,
    });
    console.log({ result });
    console.log("writing files to dest path");
    if (!result.success) {
      console.log("errors", result.errors);
      throw "bundling of vendors was not successfull!";
    }
    if (!result.outputFiles) {
      throw "no ouputFiles from bundling of vendors";
    }
    for (const file of result.outputFiles) {
      const path = splitPath.filter((part) => {
        if (part !== "" && part !== "mod.ts") return part;
        // if (part !== "") return part;
      });
      try {
        Deno.mkdir(join("vendor", ...path), { recursive: true });
      } catch (error) {
        console.error("error", { error });
      }
      Deno.writeTextFile(join("vendor", ...splitPath), file.text(), {
        create: true,
        createNew: true,
        append: true,
      });
    }
  }
}
