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
  assert.ok(router.add('foo', 'GET', '/foo', () => {}));
  assert.ok(router.add('foo_create', 'POST', '/foo', () => {}));
});

test('should accept lowercase value for method parameter', () => {
  assert.ok(router.add('root', 'get', '/', () => {}));
  assert.ok(router.add('root_create', 'post', '/', () => {}));
});

test('should be able to inspect routes', () => {
  assert.ok(router.add('root', 'get', '/', () => {}));
  assert.ok(router.add('root_create', 'post', '/', () => {}));
  // console.log(router.inspect());
  assert.ok(router.inspect());
  assert.type(router.inspect(), 'object');
});

test('should not be able to add duplicate routes', () => {
  assert.ok(router.add('duplicate', 'get', '/duplicate', () => {}));
  assert.throws(() => {
    router.add('duplicate', 'get', '/duplicate', () => {});
  });
});

test('should find correct route', () => {
  assert.ok(router.add('foo', 'GET', '/foo', () => {}));
  assert.ok(router.add('root', 'get', '/', () => {}));
  assert.ok(router.find('/'));
  // console.log(router.inspect());
});

test('should return correct pathname when given route name', () => {
  assert.ok(router.add('foo', 'GET', '/foo', () => {}));
  assert.ok(router.add('root', 'get', '/', () => {}));
  assert.equal(router.pathname('foo'), '/foo');
});

test.run();
