import { path } from "../../deps.js";

const { granted } = await Deno.permissions.request({ name: 'read' });

console.log('granted', granted);

const __filename = path.fromFileUrl(import.meta.url);
const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
const projectRoot = Deno.cwd();
const stewpotPath = path.join(__dirname, "..", "..");
const configFilename = "stewpot.config.js";
const projectConfigPath = path.join(projectRoot, configFilename);
const defaultConfigPath = path.join(
  stewpotPath,
  "src",
  "config",
  configFilename,
);
const templateConfigPath = path.join(
  stewpotPath,
  "src",
  "templates",
  configFilename,
);

export {
  stewpotPath,
  defaultConfigPath,
  projectConfigPath,
  projectRoot,
  templateConfigPath,
};
