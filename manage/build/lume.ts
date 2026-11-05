import { join } from "@std/path";
import type { BuildAdapter } from "./adapter.ts";
import { resolveWorkspacePath } from "./workspace.ts";

const configNames = ["_config.ts", "_config.js", "_config.mjs", "_config.tsx"];
const outputEntryLimit = 50;

export const lumeAdapter: BuildAdapter = {
  id: "lume",
  name: "Lume",
  async inspect(sitePath, outputDirectory) {
    const configFiles: string[] = [];
    let lumeReference = false;

    for (const name of configNames) {
      try {
        const info = await Deno.stat(join(sitePath, name));
        if (!info.isFile) continue;
        const source = await Deno.readTextFile(join(sitePath, name));
        configFiles.push(name);
        if (
          /\bfrom\s*["'][^"']*lume[^"']*["']|\bimport\s*\(\s*["'][^"']*lume[^"']*["']/i
            .test(source)
        ) {
          lumeReference = true;
        }
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) continue;
        throw error;
      }
    }

    const output = await resolveWorkspacePath(sitePath, outputDirectory);
    const outputEntries: { name: string; isDirectory: boolean }[] = [];
    let outputEntriesTruncated = false;
    let outputIsDirectory = false;
    if (output.exists) {
      const info = await Deno.stat(output.path);
      if (info.isDirectory) {
        outputIsDirectory = true;
        for await (const entry of Deno.readDir(output.path)) {
          if (outputEntries.length === outputEntryLimit) {
            outputEntriesTruncated = true;
            break;
          }
          outputEntries.push({
            name: entry.name,
            isDirectory: entry.isDirectory,
          });
        }
        outputEntries.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    return {
      adapter: "lume",
      projectDetected: lumeReference,
      configFiles,
      checks: [{
        label: "Lume import reference found",
        value: lumeReference ? "yes" : "no",
      }],
      outputDirectory,
      outputExists: output.exists,
      outputIsDirectory,
      outputEntries,
      outputEntriesTruncated,
    };
  },
};
