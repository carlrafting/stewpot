import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { run } from '../../src/cli/run.js';

test('run without command', () => {
  assert.throws(() => run(), { instanceOf: Error }, '[WARNING] No command provided! \n');
});

test('run with invalid command', () => {
  const command = 'foobar';
  assert.throws(() => run({ command }), { instanceOf: Error }, `Command '${command}' not found! \n`);
});

test('run with valid command', () => {
  assert.ok(run({ command: 'init', execute: false }));
  assert.ok(run({ command: 'start', execute: false}));
  assert.ok(run({ command: 'build', execute: false}));
});

test.run();
