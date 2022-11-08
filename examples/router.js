import stewpot from 'stewpot';
import { toFileUrl, resolve } from 'path/mod.ts';

// paths are relative to examples directory
const directory = "../test/app";
const module = async () => {
  return (await import(
    toFileUrl(resolve(directory, 'examples/router.js'))
  ));
}

stewpot({
  directory,
  module: await module()
});
