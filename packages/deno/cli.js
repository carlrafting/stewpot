import { join } from "./deps.js";

async function main(args) {
  // console.log(args);
  const denoArgs = [
    "-A"
  ];

  // TODO: cleanup forof loop and avoid repeating filenames.
  for (const file of ["import_map.json", "deno.json", "deno.jsonc"]) {
    try {
      const path = join(Deno.cwd(), file);
      /* const results = */ await Deno.readTextFile(path);
      if (file === "deno.json" || file === "deno.jsonc") {
        const i = denoArgs.length - 1;
        const item = denoArgs[i];
        // console.log("item", item)
        // console.log("item includes", item.includes("--import-map"))
        // console.log("length", denoArgs.length)
        if (item && item.includes("--import-map=")) {
          // console.log("=> popping import-map.json!")
          denoArgs.pop();
        }
        denoArgs.push(`--config=${path}`);
        break;
      } 
      if (file === "import_map.json") {
        denoArgs.push(`--import-map=${path}`)
      }
    } catch (_error) {
      // throw error;
      // console.log(error);
      // continue;
    }
  }
  
  // console.log(denoArgs);

  const process = Deno.run({
    cmd: [
      "deno",
      "run",
      ...denoArgs,
      import.meta.resolve("./bin.js"),
      ...args,
    ],
  });

  // console.log(Deno.cwd());
  // console.log({ process });

  try {
    /* const status = */ await process.status();
    // console.log(status);
  } catch (error) {
    console.log(error);
  }
}

if (import.meta.main) {
  try {
    main(Deno.args);
  } catch (error) {
    console.log(error)
  }
}
