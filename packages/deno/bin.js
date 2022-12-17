import { colors, parse, resolve, toFileUrl } from "./deps.js";
import { meta } from "./stewpot.js";
import { init } from "./init.js";

const BANNER = `
${
  colors.brightBlue(`
  ┌─┐┌┬┐┌─┐┬ ┬┌─┐┌─┐┌┬┐
  └─┐ │ ├┤ │││├─┘│ │ │ 
  └─┘ ┴ └─┘└┴┘┴  └─┘ ┴ `)
}

  🍲 ${meta.name}@v${meta.version}

  ${colors.dim(meta.description)}`;

const HELP = `
  ${BANNER.trim()}

  ${colors.bold("COMMANDS:")}

    ${colors.dim("$")} stewpot init ${colors.brightGreen("<location>")} ${
  colors.dim("intialize new project at <location>")
}
    ${colors.dim("$")} stewpot serve ${colors.brightGreen("<root>")} ${
  colors.brightGreen("<module>")
} ${colors.dim("serve module from <root>")}

  ${colors.bold("FLAGS:")}

    ${colors.dim("$")} stewpot --version (-v) ${
  colors.dim("display installed version")
}
    ${colors.dim("$")} stewpot --help (-h) ${colors.dim("display this help")}
`;

async function serve(root, module) {
  if (!root) {
    root = ".";
    /* throw new Error(
      `No root provided, try 'deno run ${import.meta.url} path/to/root'`,
    ); */
  }

  root = resolve(root);

  if (root.endsWith(".js")) {
    throw new Error(
      `Not necessary to provide a file extension, try 'deno run ${import.meta.url} path/to/root path/to/module'`,
    );
  }

  /* if (!module) {
    module = "main";
  } */
  
  /* if (!module.endsWith(".js")) {
    module = `${module}.js`;
  } */

  // if no module was explicitly specified, automatically look for a main module in root
  // exit loop when first file matching the filename is found
  if (!module) {
    for await (const item of Deno.readDir(root)) {
      if (item.isFile) {
        for (const name of ["main.ts", "main.js", "main.tsx", "main.jsx"]) {
          if (item.name === name) {
            module = item.name;
            break;
          }
        }
      }
    }
  }

  const path = toFileUrl(resolve(root, module));
  // const path = resolve(root, module);

  // console.log(path);
  
  // console.log(module)
  
  if (module) {
    module = await import(path);

    try {
      /* stewpot({
        root,
        module,
      }); */
      if (module.main) {
        return module.main();
      }
    } catch (error) {
      throw error;
    }   
  }
}

function printHelp() {
  console.log(HELP);
  Deno.exit(0);
}

function main(args) {
  args = parse(args, {
    "--": true,
    alias: {
      "version": "v",
      "help": "h",
    },
  });

  const [command, root, module] = args._;
  // const isDev = args.dev;

  // console.log(args);
  // console.log('--dev', isDev);

  // printHelp();

  if (args.help) {
    printHelp();
  }

  if (args.version) {
    console.log(BANNER);
  }

  if (
    command === "serve"
  ) {
    serve(root, module);
  }

  if (command === "init") {
    init(root);
  }
}

if (import.meta.main) {
  main(Deno.args);
}
