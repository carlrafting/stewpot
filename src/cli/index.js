// stewpot modules
import welcome from './welcome.js';
import { list } from './list.js';
import { run } from './run.js';

const args = process.argv.slice(2);
const [ command, flags ] = args;
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
