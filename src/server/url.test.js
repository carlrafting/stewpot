import test from 'ava';
import { resolve } from './url.js';

test('resolve - should return expected output', (t) => {
    t.is(resolve('/one/two/three', 'four'), '/one/two/four');
    t.is(resolve('http://example.com/', '/one'), 'http://example.com/one');
    t.is(resolve('http://example.com/one', '/two'), 'http://example.com/two');
});
