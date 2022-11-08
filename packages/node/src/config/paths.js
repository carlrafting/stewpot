import path from 'node:path';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = process.cwd();
const stewpotPath = path.join(__dirname, '..', '..');
const defaultConfigFilename = 'default.config.js';
const configFilename = 'stewpot.config.js';
const projectConfigPath = path.join(projectRoot, configFilename);
const defaultConfigPath = path.join(
    stewpotPath,
    'src',
    'config',
    defaultConfigFilename
);
const defaultConfigURL = url.pathToFileURL(defaultConfigPath);
const templateConfigPath = path.join(
    stewpotPath,
    'src',
    'templates',
    configFilename
);

export {
    stewpotPath,
    defaultConfigPath,
    projectConfigPath,
    projectRoot,
    templateConfigPath,
    configFilename,
    defaultConfigURL,
};
