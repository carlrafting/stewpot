import { commands } from './commands.js';

export function run({
  command,
  // flags,
  execute=true
}) {
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

  return execute ?
    match && match.command() :
    match;
}
