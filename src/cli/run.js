import { commands } from "./commands.js";

export function run(command, runCommand = true) {
  let message;

  if (!command) {
    message = "[WARNING] No command provided! \n";
    throw new Error(message);
  }

  message = `Command: ${command}`;

  console.log(message);

  const match = commands.find((c) => c.name === command[0]);

  if (!match) {
    message = `Command '${command}' not found! \n`;
    throw new Error(message);
  }

  return runCommand ?
    match && match.command() :
    match;
}
