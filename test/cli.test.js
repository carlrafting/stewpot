import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { list, welcome, run } from '../src/cli/index.js';

// test('test commands', () => {
//   assert.ok(true);
// });

test('welcome', async () => {
  const result = await welcome();
  assert.type(result, 'string');
  assert.not.type(result, 'undefined');
  assert.ok(result.length > 0);
});

test('list commands', () => {
  const results = list();
  assert.type(results, 'undefined');
});

test('run without command', () => {
  assert.throws(
    () => run({ execute: false }),
    { instanceOf: Error },
    '[WARNING] No command provided! \n'
  );
});

test('run with invalid command', () => {
  const command = 'foobar';
  assert.throws(
    () => run({ command, execute: false }),
    { instanceOf: Error },
    `Command '${command}' not found! \n`
  );
});

test('run with valid command', () => {
  assert.ok(run({ command: 'init', execute: false }));
  assert.ok(run({ command: 'start', execute: false }));
  assert.ok(run({ command: 'build', execute: false }));
});

test.run();
