// deno standard modules
import { parseFlags } from "../deps.js";

// stewpot modules
import welcome from "./cli/welcome.js";
import { list, run } from "./cli/commands.js";

const denoArgs = parseFlags(Deno.args);

function main() {
  welcome();
  list();

  if (Deno.args.length > 0) {
    try {
      run(denoArgs._);
    } catch (e) {
      console.error(e);
    }    
  }
}

export default main;
