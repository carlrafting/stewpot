import getDirContentDefault, { getDirContent } from '../../src/utils/dir.js';
import { test } from 'uvu';
// import * as assert from 'uvu/assert';

const dir = './test/utils/foo';

test('default dir method', async (context) => {
  const foo = getDirContentDefault(dir, { maxDepth: 5 });

  // assert.type(_test, Promise);
  // assert.throws(() => foo);
  
  console.log(`${context.__test__}~>foo Promise:`, foo);
  console.log(`${context.__test__}~>foo set:`, await foo);
});

test('dir named export method', async (context) => {
  try {
    const foo = getDirContent(dir);
    console.log(`${context.__test__}~>foo set:`, await foo);
  } catch (err) {
    console.log('dir named export method Error:', err);
  }
});

test('dir named export method filesOnly', async (context) => {
  try {
    const options = { filesOnly: true };
    const foo = getDirContent(dir, options);
    console.log(`${context.__test__}~>foo set:`, await foo);
  } catch (err) {
    console.log('dir named export method filesOnly Error:', err);
  }
});

test.run();
