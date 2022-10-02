import chalk from 'chalk';
import * as path from 'path';
import importJSON from '../utils/importJSON.js';
import fs from 'fs';
import * as os from 'os';
import { constants as FS_CONSTANTS } from 'fs';
import { projectConfigPath, templateConfigPath } from '../utils/paths.js';

const args = process.argv.slice(2);
const [command, flags] = args;
const arglen = args.length;
// console.log('args', args);

export function run({ command, /*flags,*/ execute = true }) {
    let message;

    if (!command) {
        message = '[WARNING] No command provided! \n';
        throw new Error(message);
    }

    message = `Command: ${command}`;

    console.log(message);

    const match = commands.has(command) && commands.get(command);

    if (!match) {
        message = `Command '${command}' not found! \n`;
        throw new Error(message);
    }

    return execute ? match && match.fn() : match;
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

const commands = new Map();

function defineCommand(name, description, fn) {
    if (!name && !description && !fn) {
        throw new Error('Expected 3 arguments!');
    }

    return commands.set(name, { name, description, fn });
}

defineCommand('build', 'Build project assets for production deployment', build);
function build() {
    console.log('Building project for production...');
    return;
}

defineCommand('start', 'Start development server', start);
async function start() {
    console.log('Start something great!');
}

defineCommand('init', 'Intitalize a new stewpot project', init);
async function init() {
    console.log('projectConfigPath', projectConfigPath);
    (async function () {
        await copyConfigurationFile();
    })();
}

export async function welcome() {
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

export function list() {
    console.log('  Available commands:\n');
    if (commands.size > 0) {
        for (const command of commands) {
            const [name, props] = command;
            console.log(`  stewpot ${name}:\n`, `    ${props.description}\n`);
        }
    }
}

export async function main() {
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

export default main;
