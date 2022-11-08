import { dirname, join, resolve } from "path/mod.ts";

const HELP = `stewpot`;
const DENO_JSON_NAME = "deno.json";
const DENO_JSON_CONTENT = `{
  "importMap": "import_map.json",
  "tasks": {
    "bin": "deno run ${import.meta.resolve("./bin.js")}",
    "dev": "deno run --watch --allow-net --allow-read main.js --dev"
  }
}`;
const IMPORT_MAP_NAME = "import_map.json";
const IMPORT_MAP_CONTENT = `{
  "imports": {
    "stewpot/": "${dirname(import.meta.url)}/",
    "http/": "https://deno.land/std@0.162.0/http/",
    "path/": "https://deno.land/std@0.162.0/path/"
  }
}`;
const MAIN_NAME = "main.js";
const MAIN_CONTENT = `
import stewpot from "stewpot/stewpot.js";
import { dirname, fromFileUrl } from "path/mod.ts";

const directory = dirname(fromFileUrl(import.meta.url));

function handler() {
  return new Response("Hello World!");
}

stewpot({
  directory,
  handler,
});`.trim();

async function init(directory) {
  directory = resolve(directory);

  console.log(`Intializing new stewpot project at ${directory}...`);

  try {
    const dir = [...Deno.readDirSync(directory)];
    if (dir.length > 0) {
      const confirmed = confirm(
        "Directory is not empty, are you sure you want to continue?",
      );
      if (!confirmed) {
        throw new Error("Directory not empty, aborting.");
      }
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }

  await Deno.mkdir(join(directory, "public"), { recursive: true });
  await Deno.mkdir(join(directory, "templates"), { recursive: true });
  await Deno.writeTextFile(
    join(directory, MAIN_NAME),
    MAIN_CONTENT,
  );
  await Deno.writeTextFile(
    join(directory, "templates/index.html"),
    "<h1>Hello Stewpot</h1>",
  );
  await Deno.writeTextFile(
    join(directory, DENO_JSON_NAME),
    DENO_JSON_CONTENT,
  );
  await Deno.writeTextFile(
    join(directory, IMPORT_MAP_NAME),
    IMPORT_MAP_CONTENT,
  );
  console.log(
    "Initialized new stewpot project, run `deno task dev` to get started!",
  );
}

function printHelp() {
  console.log(HELP);
  Deno.exit(0);
}

if (import.meta.main) {
  if (Deno.args.includes("-h") || Deno.args.includes("--help")) {
    printHelp();
  }

  const [directory] = Deno.args;

  if (directory === null) {
    printHelp();
  }

  await init(directory);
}
