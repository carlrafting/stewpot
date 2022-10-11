import chalk from 'chalk';
import pkg from '../../package.json' assert { type: 'json' };

export function logger(req, res) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(
        `[${chalk.cyan(pkg.name)}][${chalk.dim(timestamp)}] - ${chalk.blue(
            req.method
        )} - ${chalk.white(req.url)} - ${chalk.bold(res.statusCode)}`
    );
}
