import test from 'ava';
import r from './router.js';

let router;

test.beforeEach(() => {
    router = r();
});

test('should add routes', (t) => {
    t.assert(router.add('GET', 'foo', () => {}));
    t.assert(router.add('POST', 'foo', () => {}));
});

test('should accept lowercase value for method parameter', (t) => {
    t.assert(router.add('get', 'root', () => {}));
    t.assert(router.add('post', 'root', () => {}));
});

test('should not be able to add duplicate routes', (t) => {
    t.assert(router.add('get', 'duplicate', () => {}));
    t.assert(router.add('get', 'duplicate', () => {}));
});

test('should find correct route', (t) => {
    t.assert(router.add('GET', 'foo', () => {}));
    t.assert(router.add('get', 'root', () => {}));
    t.assert(router.find('/'));
    // console.log(router.inspect());
});

// test.run();
