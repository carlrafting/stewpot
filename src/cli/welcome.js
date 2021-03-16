import chalk from 'chalk';
import * as path from 'path';
import importJSON from '../utils/importJSON.js';

export default async function welcome() {
  const pkg = await importJSON(path.join('..', '..', 'package.json'));

  const message = `
********************************************************************

    🍲    ${pkg.name}@v${pkg.version}

    ${chalk.dim(pkg.description)}

********************************************************************\n`;

  console.log(message);

  return message;
}
