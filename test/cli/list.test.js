import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { list } from "../../src/cli/list.js";

test('list commands', () => {
  const results = list();
  assert.is(typeof results, 'string');
});
