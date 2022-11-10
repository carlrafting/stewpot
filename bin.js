import { resolve, toFileUrl } from "./deps.js";
import stewpot from "./stewpot.js";
import { init } from './init.js';

async function serve(directory, module) {
  if (!directory) {
    directory = '.';
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

  console.log(path);

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

function main(args) {
  const [command, directory, module] = args;
  // const isDev = args.includes("--dev");

  console.log(args)

  if (
    !command ||
    command === '' ||
    command === 'serve'
  ) {
    serve(directory, module);
  }

  if (command === 'init') {
    init(directory);
  }
}

if (import.meta.main) {
  main(Deno.args);
}
