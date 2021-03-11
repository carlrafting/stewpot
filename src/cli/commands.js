import init from "./commands/init.js";
import build from "./commands/build.js";
import start from "./commands/start.js";

export const commands = [
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
    command: build
  },
];
