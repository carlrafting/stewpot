import { test } from 'uvu';
import * as assert from 'uvu/assert';
import welcome from '../../src/cli/welcome.js';

test('welcome', async () => {
  const result = await welcome();
  assert.type(result, 'string');
  assert.not.type(result, 'undefined');
  assert.ok(result.length > 0);
});

test.run();
