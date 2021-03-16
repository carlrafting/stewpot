import * as path from 'path';
import * as url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = process.cwd();
const stewpotPath = path.join(__dirname, '..', '..');
const configFilename = 'stewpot.config.js';
const projectConfigPath = path.join(projectRoot, configFilename);
const defaultConfigPath = path.join(
  stewpotPath,
  'src',
  'config',
  configFilename,
);
const templateConfigPath = path.join(
  stewpotPath,
  'src',
  'templates',
  configFilename,
);

export {
  stewpotPath,
  defaultConfigPath,
  projectConfigPath,
  projectRoot,
  templateConfigPath,
};
