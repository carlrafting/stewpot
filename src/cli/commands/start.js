import fs from 'fs';
import { defaultConfigPath, projectConfigPath } from '../../utils/paths.js';
import { exists } from '../../utils/exists.js';
import { pathToFileURL } from 'url';
// import { server } from "../server.js";

const { R_OK } = fs.constants;

function loadConfigurationFile(path) {
  const url = pathToFileURL(path, 'file:');
  
  return (
    import(url)
      .then(module => module.default)
      .catch(e => console.log(e))
  );
}

function getConfigProps(config) {
  return (typeof config === 'function' ? config() : config);
}

export default async function start() {
  const projectConfigExists = await exists(projectConfigPath);
  const config = await (async () => {
    const module = await loadConfigurationFile(
      projectConfigExists ? projectConfigPath : defaultConfigPath,
    );    
    return {
      ...getConfigProps(module)
    };
  })();

  const serverKeysLength = Object.keys(config.server).length;
  const watchKeysLength = Object.keys(config.watch).length;
  
  // TODO: validate config file. If no properties were found, merge with default config.

  // server({ ...serverConfig });

  // console.log('defaultConfig', defaultConfig);

  return;

  if (!watch) {
    return;  
  }

  const watchKeys = Object.keys(watch);
  const watchDirs = watchKeys.map((dir) => dir);
  const watchDirPaths = watchDirs.map((dir) => path.join(Deno.cwd(), dir));

  console.log("watchDirs", watchDirs);
  console.log("watchDirPaths", watchDirPaths);

  // TODO: Finish iterate over watch options object...
  const watchUrls = watchKeys.map((url) => {
    if (typeof url === "string") {
      return watch[url];
    }

    console.log(url);
  });

  console.log("watchUrls", watchUrls);

  watchDirPaths.forEach(async (path) => {
    console.log(path);

    const watcher = Deno.watchFs(path);

    for await (const event of watcher) {
      console.log(event);
    }
  });
}
