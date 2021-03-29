// stewpot modules
import welcome from './cli/welcome.js';
import { list } from './cli/list.js';
import { run } from './cli/run.js';

const args = process.argv.slice(2);
const { command, flags } = args;
const arglen = args.length;
console.log('args', args);

async function main() {
  if (arglen === 0) {
    await welcome();
    list();
  }

  if (arglen > 0) {
    try {
      run({
        command,
        flags
      });
    } catch (e) {
      console.error(e);
    }    
  }
}

export default main;
