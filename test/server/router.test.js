import { test } from 'uvu';
import * as assert from 'uvu/assert';
import * as router from '../../src/server/router.js';

test.after.each(() => {
  console.log('routes', router.routes)
});

test("should add routes", () => {
  assert.ok(router.add('GET', '/foo', () => {}));
  assert.ok(router.add('POST', '/foo', () => {}));
});

test("should accept lowercase value for method parameter", () => {
  assert.ok(router.add('get', '/', () => {}));
  assert.ok(router.add('post', '/', () => {}));
});

test("should be able to get current routes", () => {
  assert.ok(router.routes);
});

test("should be able to find urls with the same path", () => {
  console.log('hasURL', router.hasURL('/'));
  assert.ok(router.hasURL('/'));
});

test("should not be able to add duplicate routes", () => {
  assert.ok(router.add('get', '/duplicate', () => {}));
  assert.not.ok(router.add('get', '/duplicate', () => {}));
});
