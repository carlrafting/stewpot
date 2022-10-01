import { test } from 'uvu';
import * as assert from 'uvu/assert';
import useRouter from '../../src/server/router.js';

// console.log(router);

let router;

test.before.each(() => {
  router = useRouter();
});

test.after.each(() => {
  router
    // .inspect()
    .clear();
});

test('should add routes', () => {
  assert.ok(router.add('GET', 'foo', () => {}));
  assert.ok(router.add('POST', 'foo', () => {}));
});

test('should accept lowercase value for method parameter', () => {
  assert.ok(router.add('get', 'root', () => {}));
  assert.ok(router.add('post', 'root', () => {}));
});

test('should be able to inspect routes', () => {
  assert.ok(router.add('get', 'root', () => {}));
  assert.ok(router.add('post', 'root', () => {}));
  // console.log(router.inspect());
  assert.ok(router.inspect());
  assert.type(router.inspect(), 'object');
});

test('should not be able to add duplicate routes', () => {
  assert.ok(router.add('get', 'duplicate', () => {}));
  assert.not.ok(router.add('get', 'duplicate', () => {}));
});

test('should find correct route', () => {
  assert.ok(router.add('GET', 'foo', () => {}));
  assert.ok(router.add('get', 'root', () => {}));
  assert.ok(router.find('/'));
  // console.log(router.inspect());
});

test('should return correct pathname when given route name', () => {
  assert.ok(router.add('GET', 'foo', () => {}));
  assert.ok(router.add('get', 'root', () => {}));
  assert.equal(router.pathname('foo', 'get'), '/foo');
});

test.run();
