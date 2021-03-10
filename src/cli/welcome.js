import chalk from "chalk";
import * as path from "path";
import importJSON from '../utils/importJSON.js';

const pkg = await importJSON(path.join('..', '..', 'package.json'));

export default function welcome() {
  const message = `
********************************************************************

    🍲    ${pkg.name}@v${pkg.version}

    ${chalk.dim(pkg.description)}

********************************************************************\n`;

  console.log(message);

  return message;
}
