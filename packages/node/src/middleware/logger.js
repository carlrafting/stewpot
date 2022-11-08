import chalk from 'chalk';
// import pkg from '../../package.json' assert { type: 'json' }; // eslint-disable-line
import importJSON from '../utils/importJSON.js';

const pkg = await importJSON('../../package.json');

export function logger(req, res) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(
        `[${chalk.cyan(pkg.name)}][${chalk.dim(timestamp)}] - ${chalk.blue(
            req.method
        )} - ${chalk.dim(req.url)} - ${chalk.bold(
            res.statusCode === 200
                ? chalk.green(res.statusCode)
                : res.statusCode
        )}`
    );
}
