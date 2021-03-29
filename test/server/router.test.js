import { test } from 'uvu';
import * as assert from 'uvu/assert';
import stewpotRouter from '../../src/server/router.js';

let router;

test.before.each(() => {
  router = stewpotRouter();
});

test('should add routes', () => {
  assert.ok(router.add('foo', 'GET', '/foo', () => {}));
  assert.ok(router.add('foo_update', 'POST', '/foo', () => {}));
});

test('should accept lowercase value for method parameter', () => {
  assert.ok(router.add('root', 'get', '/', () => {}));
  assert.ok(router.add('root_update', 'post', '/', () => {}));
});

test('should be able to get current routes', () => {
  assert.ok(router.routes());
  assert.type(router.routes(), 'object');
});

test('should not be able to add duplicate routes', () => {
  assert.ok(router.add('duplicate', 'get', '/duplicate', () => {}));
  assert.not.ok(router.add('duplicate', 'get', '/duplicate', () => {}));
});

test.run();
