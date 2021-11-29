#!/usr/bin/env node

import chalk from 'chalk';
import * as path from 'path';
import importJSON from './utils/importJSON.js';
import fs from 'fs';
import * as os from 'os';
import { constants as FS_CONSTANTS } from 'fs';
import { projectConfigPath, templateConfigPath } from './utils/paths.js';

const args = process.argv.slice(2);
const [command, flags] = args;
const arglen = args.length;
console.log('args', args);

function run({ command, flags, execute = true }) {
  let message;

  if (!command) {
    message = '[WARNING] No command provided! \n';
    throw new Error(message);
  }

  message = `Command: ${command}`;

  console.log(message);

  const match = commands.find((c) => c.name === command);

  if (!match) {
    message = `Command '${command}' not found! \n`;
    throw new Error(message);
  }

  return execute ? match && match.command() : match;
}

const {
  errno: { EEXIST },
} = os.constants;

async function copyConfigurationFile() {
  try {
    await fs.promises.copyFile(
      templateConfigPath,
      projectConfigPath,
      FS_CONSTANTS.COPYFILE_EXCL
    );
    console.log(chalk.green('✅   Configuration file created!'));
  } catch (err) {
    console.log(chalk.red('⛔   Could not create configuration file!'));
    // NOTE: not sure if this is a good way to check for errors, probably not.
    if (err.errno === -EEXIST) {
      console.info(chalk.white('  ↳   Config file already exists!'));
    }
  }
}

export const commands = [
  {
    name: 'init',
    description: 'Intitalize a new stewpot project',
    command: init,
  },
  {
    name: 'start',
    description: 'Start development server',
    command: start,
  },
  {
    name: 'build',
    description: 'Build project assets for production deployment',
    command: build,
  },
];

function build() {
  console.log('Building project for production...');
}

async function start() {
  console.log('Start something great!');
}

async function init() {
  console.log('projectConfigPath', projectConfigPath);
  (async function () {
    await copyConfigurationFile();
  })();
}

async function welcome() {
  const pkg = await importJSON(path.join('..', '..', 'package.json'));

  const message = `
  ┌─┐┌┬┐┌─┐┬ ┬┌─┐┌─┐┌┬┐
  └─┐ │ ├┤ │││├─┘│ │ │ 
  └─┘ ┴ └─┘└┴┘┴  └─┘ ┴ 

  🍲 ${pkg.name}@v${pkg.version}

  ${chalk.dim(pkg.description)}
`;

  console.log(message);

  return message;
}

function list() {
  console.log('  Available commands:');
  console.table(commands);
}

async function main() {
  if (arglen === 0) {
    await welcome();
    list();
  }

  if (arglen > 0) {
    try {
      run({
        command,
        flags,
      });
    } catch (e) {
      console.error(e);
    }
  }
}

export default main();
