import { test } from 'uvu';
import * as assert from 'uvu/assert';
import r from '../../src/server/router.js';

// console.log(router);

let router;

test.before.each(() => {
    router = r();
});

test('should add routes', () => {
    assert.ok(router.add('GET', 'foo', () => {}));
    assert.ok(router.add('POST', 'foo', () => {}));
});

test('should accept lowercase value for method parameter', () => {
    assert.ok(router.add('get', 'root', () => {}));
    assert.ok(router.add('post', 'root', () => {}));
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

test.run();
