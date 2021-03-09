import test from 'ava';
import { run, list } from './commands.js';

test('run without command', t => {
  t.throws(() => run(), { instanceOf: Error }, '[WARNING] No command provided! \n');
});

test('run with invalid command', t => {
  const command = ['foobar'];
  t.throws(() => run(command), { instanceOf: Error }, `Command '${command}' not found! \n`);
});

test('run with valid command', t => {
  t.assert(run(['start'], false));
  t.assert(run(['init'], false));
  t.assert(run(['build'], false));
});

test('list commands', t => {
  const results = list();
  t.assert(typeof results === 'string');
});
