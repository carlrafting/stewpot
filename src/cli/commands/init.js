// import { copy, exists, green, red } from "../../../deps.js";
import * as fs from 'fs/promises';
import { constants as FS_CONSTANTS } from 'fs';
import chalk from 'chalk';

import {
  projectConfigPath,
  projectRoot,
  templateConfigPath,
} from "../../utils/paths.js";

async function copyConfigurationFile() {
  try {
    await fs.copyFile(templateConfigPath, projectConfigPath, FS_CONSTANTS.COPYFILE_EXCL);
    console.log(chalk.green("✅   Configuration file created!"));
  } catch (e) {
    console.log(chalk.red("⛔   Could not create configuration file!"));
    if (e.code === 'EEXIST') {
      console.info("Config file already exists!")
    }
  }    
}

export default async function init() {
  console.log('projectConfigPath', projectConfigPath);
  await copyConfigurationFile();
}
