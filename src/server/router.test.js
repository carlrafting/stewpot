import test from 'ava';
import r from './router.js';
import { methods } from './router.js';

// test has to run serially due to sharing the router variable.
// https://github.com/avajs/ava/blob/main/docs/08-common-pitfalls.md#sharing-variables-between-asynchronous-tests

const empty = () => {};

let router;

test.beforeEach(() => {
    router = r();
});

function create() {
    return r();
}

test.serial('add - should add routes for all http methods', (t) => {
    methods.map((method) => {
        router.add(method, '/', empty);
    });

    t.is(router.routes.length, methods.length), 'has same length';
});

test.serial('add - is chainable', (t) => {
    const actual = router.add('get', '/', empty);
    t.is(typeof actual, 'object');
    t.not(typeof actual, 'undefined');
    t.assert(actual !== undefined);
});

test.serial('add - should accept lowercase value for method parameter', (t) => {
    ['get', 'post'].map((method) => router.add(method, '/', empty));
    t.assert(router.routes.length > 0);
    t.is(router.routes.length, 2);
    router.routes.map((route) => {
        t.assert(typeof route.method === 'string');
        t.is(route.method, route.method.toLowerCase());
    });
});

test('find - should find correct route', (t) => {
    const router = create();
    router.add('get', '/', empty);
    router.add('get', '/foo', empty);
    const results = router.find('get', '/');
    t.assert(typeof results.params === 'object');
    t.assert(Array.isArray(results.handlers));
    t.is(results.handlers.length, 1);
    t.assert(typeof results.handlers[0] === 'function');
});
