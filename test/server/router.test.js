import { test } from 'uvu';
import * as assert from 'uvu/assert';
import * as router from '../../src/server/router.js';
// default export
// import router from '../../src/server/router.js';

// console.log(router);

test.after.each(() => {
  router
    // .inspect()
    .clear();
});

test('should add routes', () => {
  assert.ok(router.add('GET', 'foo', '/foo', () => {}));
  assert.ok(router.add('POST', 'foo_create', '/foo', () => {}));
});

test('should accept lowercase value for method parameter', () => {
  assert.ok(router.add('get', 'root', '/', () => {}));
  assert.ok(router.add('post', 'root_create', '/', () => {}));
});

test('should be able to inspect routes', () => {
  assert.ok(router.add('get', 'root', '/', () => {}));
  assert.ok(router.add('post', 'root_create', '/', () => {}));
  // console.log(router.inspect());
  assert.ok(router.inspect());
  assert.type(router.inspect(), 'object');
});

test('should not be able to add duplicate routes', () => {
  assert.ok(router.add('get', 'duplicate', '/duplicate', () => {}));
  assert.throws(() => {
    router.add('get', 'duplicate', '/duplicate', () => {});
  });
});

test('should find correct route', () => {
  assert.ok(router.add('GET', 'foo', '/foo', () => {}));
  assert.ok(router.add('get', 'root', '/', () => {}));
  assert.ok(router.find('/'));
  // console.log(router.inspect());
});

test('should return correct pathname when given route name', () => {
  assert.ok(router.add('GET', 'foo', '/foo', () => {}));
  assert.ok(router.add('get', 'root', '/', () => {}));
  assert.equal(router.pathname('foo'), '/foo');
});

test.run();
