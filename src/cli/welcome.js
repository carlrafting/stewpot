import chalk from "chalk";
import { DESCRIPTION, NAME, VERSION } from "../../info.js";

export default function welcome() {
  const message = `
********************************************************************

    ${NAME}@v${VERSION}

    🎉 ${chalk.green("Welcome to stewpot!")}

    ${chalk.dim(DESCRIPTION)}

********************************************************************\n`;

  console.log(message);

  return message;
}
