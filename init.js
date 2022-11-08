import {
  fromFileUrl,
  join,
  resolve,
} from "path/mod.ts";

const HELP = `stewpot`;
const DENO_JSON_NAME = "deno.json";
const DENO_IMPORT_MAP_NAME = "import_map.json";

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
    join(directory, "templates/index.html"),
    "<h1>Hello Stewpot</h1>",
  );
  await Deno.copyFile(
    fromFileUrl(import.meta.resolve(`./${DENO_JSON_NAME}`)),
    join(directory, DENO_JSON_NAME),
  );
  await Deno.copyFile(
    fromFileUrl(import.meta.resolve(`./${DENO_IMPORT_MAP_NAME}`)),
    join(directory, DENO_IMPORT_MAP_NAME),
  );
  // await Deno.writeTextFile(join(directory, DENO_JSON_NAME), DENO_JSON_CONTENTS);
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
