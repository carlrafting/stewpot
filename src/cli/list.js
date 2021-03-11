import { commands } from "./commands.js";

export function list() {
  let text = `   Available Commands: \n`;

  commands.forEach((command) => {
    text += [`   stewpot ${command.name}`, `     ${command.description} \n`].join(' ');
  }
  );

  console.log(text);
  console.log("\n");

  return text;
}
