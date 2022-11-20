import { parse, resolve, toFileUrl } from "./deps.js";
import stewpot, { meta } from "./stewpot.js";
import { init } from "./init.js";
import * as colors from "https://deno.land/std@0.165.0/fmt/colors.ts";

const BANNER = `
${colors.brightBlue(`
  ┌─┐┌┬┐┌─┐┬ ┬┌─┐┌─┐┌┬┐
  └─┐ │ ├┤ │││├─┘│ │ │ 
  └─┘ ┴ └─┘└┴┘┴  └─┘ ┴ `)}

  🍲 ${meta.name}@v${meta.version}

  ${colors.dim(meta.description)}`;

const HELP = `
  ${BANNER.trim()}

  ${colors.bold("COMMANDS:")}

    ${colors.dim("$")} stewpot init ${colors.brightGreen("<location>")} ${colors.dim("intialize new project at <location>")}
    ${colors.dim("$")} stewpot serve ${colors.brightGreen("<directory>")} ${colors.brightGreen("<module>")} ${colors.dim("serve module from <directory>")}

  ${colors.bold("FLAGS:")}

    ${colors.dim("$")} stewpot --version (-v) ${colors.dim("display installed version")}
    ${colors.dim("$")} stewpot --help (-h) ${colors.dim("display this help")}
`;

async function serve(directory, module) {
  if (!directory) {
    directory = ".";
    /* throw new Error(
      `No directory provided, try 'deno run ${import.meta.url} path/to/directory'`,
    ); */
  }

  directory = resolve(directory);

  if (directory.endsWith(".js")) {
    throw new Error(
      `Not necessary to provide a file extension, try 'deno run ${import.meta.url} path/to/directory path/to/module'`,
    );
  }

  if (!module) {
    module = "main";
  }

  if (!module.endsWith(".js")) {
    module = `${module}.js`;
  }

  const path = toFileUrl(resolve(directory, module));
  // const path = resolve(directory, module);

  // console.log(path);

  module = await import(path);

  try {
    stewpot({
      directory,
      module,
    });
  } catch (error) {
    throw error;
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
      "help": "h"
    }
  });
  
  
  const [command, directory, module] = args._;
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
    serve(directory, module);
  }

  if (command === "init") {
    init(directory);
  }
}

if (import.meta.main) {
  main(Deno.args);
}
