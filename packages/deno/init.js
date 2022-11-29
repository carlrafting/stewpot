import { dirname, join, resolve, fromFileUrl } from "./deps.js";

const STD_VERSION = "0.166.0";
const DENO_JSON_NAME = "deno.json";
const DENO_JSON_CONTENT = {
  "importMap": "./import_map.json",
  "tasks": {
    "dev": "deno run --watch --allow-net --allow-read main.js --dev"
  }
};
const IMPORT_MAP_NAME = "import_map.json";
const IMPORT_MAP = {
  "imports": {
    "stewpot/": `${dirname(import.meta.url)}/`,
    "http/": `https://deno.land/std@${STD_VERSION}/http/`,
    "path/": `https://deno.land/std@${STD_VERSION}/path/`
  }
};
const MAIN_FILE = {
  name: "main.js",
  content: `
import stewpot from "stewpot/stewpot.js";

stewpot();`.trim()
};

export async function init(directory) {
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

  if (confirm("Does your project require JSX?")) {
    IMPORT_MAP.imports = {
      ...IMPORT_MAP.imports,
      "preact": "https://esm.sh/preact@10.11.3",
      "preact/": "https://esm.sh/preact@10.11.3/",
      "preact-render-to-string": "https://esm.sh/preact-render-to-string@5.2.6?external=preact"
    }
    MAIN_FILE.name = "main.jsx";
    MAIN_FILE.content = `
  import stewpot, { send } from "stewpot/stewpot.js";
  import jsxPlugin from "stewpot/plugins/jsx.js";
  
  function handler({ pathname, render }) {
    if (pathname === "/") {
      return async () => {
        return send(await render(<h1>Hello Stewpot</h1>, { inline: true, data: { title: "Welcome Home!"} }));
      };
    }
  }
  
  stewpot({
    handler,
    plugins: [jsxPlugin()],
    templateFormat: "jsx",
  });`.trim();
    DENO_JSON_CONTENT["tasks"] = {"dev": `deno run --watch --allow-net --allow-read ${MAIN_FILE.name} --dev`}
    DENO_JSON_CONTENT["compilerOptions"] = {
      "jsx": "react-jsx",
      "jsxImportSource": "preact"
    }
  }

  await Deno.mkdir(join(directory, "public"), { recursive: true });
  await Deno.mkdir(join(directory, "templates"), { recursive: true });
  await Deno.writeTextFile(
    join(directory, MAIN_FILE.name),
    MAIN_FILE.content,
  );
  // await Deno.copyFile(fromFileUrl(import.meta.resolve("./templates/main.js")), join(directory, MAIN_FILE.name));
  await Deno.writeTextFile(
    join(directory, "templates/index.html"),
    "<h1>Hello Stewpot</h1>",
  );
  await Deno.writeTextFile(
    join(directory, DENO_JSON_NAME),
    JSON.stringify(DENO_JSON_CONTENT, null, 2),
  );
  await Deno.writeTextFile(
    join(directory, IMPORT_MAP_NAME),
    JSON.stringify(IMPORT_MAP, null, 2),
  );
  console.log(
    "Initialized new project with stewpot, run `deno task dev` to get started!",
  );
}

if (import.meta.main) {
  const [directory] = Deno.args;

  if (!directory || directory === null) {
    printHelp();
  }

  await init(directory);
}
