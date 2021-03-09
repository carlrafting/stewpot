import init from "./commands/init.js";
import build from "./commands/build.js";
import start from "./commands/start.js";

const commands = [
  {
    name: "init",
    description: "Intitalize a new stewpot project",
    command: init,
  },
  { 
    name: "start", 
    description: "Start development server", 
    command: start 
  },
  {
    name: "build",
    description: "Build project assets for production deployment",
    command: build,
  },
];

export function list() {
  let text = `   Available Commands: \n`;

  commands.forEach((command) => {
      text += [`   stewpot ${command.name}`,  `     ${command.description} \n`].join(' ')
    }
  );

  console.log(text);
  console.log("\n");

  return text;
}

export function run(command, runCommand=true) {
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
  
  // runCommand && match && match.command();
  
  return runCommand ?
    match && match.command() :
    match;
}
