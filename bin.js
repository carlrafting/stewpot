import { resolve, toFileUrl } from "path/mod.ts";
import stewpot from "stewpot";

if (import.meta.main) {
  let [directory, module] = Deno.args;

  if (!module) {
    module = "main";
  }

  module = `${module}.js`;

  if (!directory) {
    throw new Error(
      `No directory provided, try 'deno run ${import.meta.url} path/to/directory'`,
    );
  }

  if (directory.endsWith(".js")) {
    throw new Error(
      `Not necessary to provide a file extension, try 'deno run ${import.meta.url} path/to/directory'`,
    );
  }

  module = await import(
    toFileUrl(resolve(directory, module))
  );

  stewpot({
    port: 8080,
    directory,
    module,
  });
}
