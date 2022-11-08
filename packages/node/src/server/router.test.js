import test from 'ava';
import r from './router.js';
import { methods } from './router.js';

const empty = () => {};

function setup() {
    return {
        router: r(),
        request: {},
    };
}

test('add - should add routes for all http methods', (t) => {
    const { router } = setup();
    methods.map((method) => {
        router.add(method, '/', empty);
    });

    t.is(router.routes.length, methods.length), 'has same length';
});

test('add - is chainable', (t) => {
    const { router } = setup();
    const actual = router.add('get', '/', empty);
    t.is(typeof actual, 'object');
    t.not(typeof actual, 'undefined');
    t.assert(actual !== undefined);
});

test('add - should accept lowercase value for method parameter', (t) => {
    const { router } = setup();
    ['get', 'post'].map((method) => router.add(method, '/', empty));
    t.assert(router.routes.length > 0);
    t.is(router.routes.length, 2);
    router.routes.map((route) => {
        t.assert(typeof route.method === 'string');
        t.is(route.method, route.method.toLowerCase());
    });
});

test('find - should find correct route', (t) => {
    const { router } = setup();
    router.add('get', '/', empty);
    router.add('get', '/foo', empty);
    const results = router.find('get', '/');
    t.assert(typeof results.params === 'object');
    t.assert(Array.isArray(results.handlers));
    t.is(results.handlers.length, 1);
    t.assert(typeof results.handlers[0] === 'function');
});

test('params - should return params object for current request if route matches', (t) => {
    const request = {
        url: '/posts/hello',
        headers: {
            host: 'localhost',
        },
    };
    const expected = {
        title: 'hello',
    };
    const { router } = setup();
    router.get('/', empty);
    router.get('/posts', empty);
    router.get('/posts/:title', empty);
    const results = router.params(request);
    t.assert(typeof results === 'object');
    t.deepEqual(results, expected);
});

test('params - should return empty object for current request if route does not contain params', (t) => {
    const request = {
        url: '/posts',
        headers: {
            host: 'localhost',
        },
    };
    const expected = {};
    const { router } = setup();
    router.get('/', empty);
    router.get('/posts', empty);
    router.get('/posts/:title', empty);
    const results = router.params(request);
    t.assert(typeof results === 'object');
    t.deepEqual(results, expected);
});

test('params - should return empty object for current request if route does not match', (t) => {
    const request = {
        url: '/hello',
        headers: {
            host: 'localhost',
        },
    };
    const expected = {};
    const { router } = setup();
    router.get('/', empty);
    router.get('/posts', empty);
    router.get('/posts/:title', empty);
    const results = router.params(request);
    t.assert(typeof results === 'object');
    t.deepEqual(results, expected);
});
