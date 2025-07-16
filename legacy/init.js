import { dirname, join, resolve } from "./deps/path.js";
import { ensureFile } from "./deps/fs.js";
import { parseFlags } from "./deps/flags.js";

const STD_VERSION = "0.201.0";
const DENO_JSON_NAME = "deno.json";
const DENO_JSON_CONTENT = {
  "imports": {
    "stewpot/": `${dirname(import.meta.url)}/`,
    "http/": `https://deno.land/std@${STD_VERSION}/http/`,
    "path/": `https://deno.land/std@${STD_VERSION}/path/`,
  },
  "tasks": {
    "dev": "deno run --watch --allow-net --allow-read main.js --dev",
  },
};
const MAIN_FILE = {
  name: "main.js",
  content: `
import { stewpot } from "stewpot/stewpot.js";

export function main() {
  return stewpot();
}

if (import.meta.main) {
  main();
}
`.trim(),
};

export async function init(path) {
  const directory = resolve(path);

  // console.log("directory", directory);

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

  if (confirm("Install and configure CLI?")) {
    const installPath = dirname(Deno.execPath());
    console.log("installPath", installPath);
    if (ensureFile(join(installPath, "stewpot"))) {
      const command = new Deno.Command(Deno.execPath(), {
        // stdin: "piped",
        // stdout: "piped",
        args: [
          "install",
          "-Af",
          "--name=stewpot",
          import.meta.resolve("./cli.js"),
        ],
      });
      const child = command.spawn();
      await child.output();
    }
  }

  if (confirm("Does your project require JSX?")) {
    DENO_JSON_CONTENT.imports = {
      ...DENO_JSON_CONTENT.imports,
      "preact": "https://esm.sh/preact@10.17.1",
      "preact/": "https://esm.sh/preact@10.17.1/",
      "preact-render-to-string":
        "https://esm.sh/preact-render-to-string@6.2.1?external=preact",
    };
    MAIN_FILE.name = "main.jsx";
    MAIN_FILE.content = `
  import { stewpot, send } from "stewpot/stewpot.js";
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
    DENO_JSON_CONTENT["tasks"] = {
      "dev":
        `deno run --watch --allow-net --allow-read ${MAIN_FILE.name} --dev`,
    };
    DENO_JSON_CONTENT["compilerOptions"] = {
      "jsx": "react-jsx",
      "jsxImportSource": "preact",
    };
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
  console.log(
    "Initialized new project with stewpot, run `deno task dev` to get started!",
  );
}

function main(args) {
  console.log("hello world!");
  const parsedFlags = parseFlags(args);
  const length = parsedFlags._.length;
  // console.log("parsedFlags", parsedFlags._);
  if (length === 0) {
    throw new Error(`Expect 1 argument of type: string`);
  }
  if (length > 1) {
    throw new Error(`Only expected 1 argument, got ${parsedFlags._.length}`);
  }
  const [path] = parsedFlags._;
  // console.log("path", path);
  init(path);
}

if (import.meta.main) {
  try {
    main(Deno.args);
  } catch (error) {
    throw error;
  }
}
