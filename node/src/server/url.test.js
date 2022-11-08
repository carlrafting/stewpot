import test from 'ava';
import { resolve, parse } from './url.js';

test('resolve - should return expected output', (t) => {
    t.is(resolve('/one/two/three', 'four'), '/one/two/four');
    t.is(resolve('http://example.com/', '/one'), 'http://example.com/one');
    t.is(resolve('http://example.com/one', '/two'), 'http://example.com/two');
});

test('parse - should return new URL instance', (t) => {
    const req = {
        url: '/',
        headers: {
            host: 'localhost',
        },
    };
    const url = parse(req);
    t.assert(url instanceof URL);
});

test('parse - should return http protocol by default', (t) => {
    const req = {
        url: '/',
        headers: {
            host: 'localhost',
        },
    };
    const url = parse(req);
    t.assert(url.protocol);
    t.is(url.protocol, 'http:');
});

test('parse - should return https protocol when specified', (t) => {
    const req = {
        url: '/',
        headers: {
            host: 'localhost',
        },
    };
    const url = parse(req, 'https://');
    t.assert(url.protocol);
    t.is(url.protocol, 'https:');
});
