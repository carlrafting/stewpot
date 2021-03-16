// import { copy, exists, green, red } from "../../../deps.js";
import * as fs from 'fs/promises';
import * as os from 'os';
import { constants as FS_CONSTANTS } from 'fs';
import chalk from 'chalk';
import {
  projectConfigPath,
  templateConfigPath,
} from '../../utils/paths.js';

const { errno:{ EEXIST } } = os.constants;

async function copyConfigurationFile() {
  try {
    await fs.copyFile(templateConfigPath, projectConfigPath, FS_CONSTANTS.COPYFILE_EXCL);
    console.log(chalk.green('✅   Configuration file created!'));
  } catch (err) {
    console.log(chalk.red('⛔   Could not create configuration file!'));
    // NOTE: not sure if this is a good way to check for errors, probably not.
    if (err.errno === -EEXIST) {
      console.info(chalk.white('  ↳   Config file already exists!'));
    }
  }    
}

export default function init() {
  console.log('projectConfigPath', projectConfigPath);
  copyConfigurationFile();
}
