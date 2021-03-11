import { test } from 'uvu';
import * as assert from 'uvu/assert';
import welcome from "../src/cli/welcome.js";

test("welcome", () => {
  const result = welcome();
  assert.is(typeof result, "string");
  assert.is.not(typeof result, undefined);
});

test.run();
