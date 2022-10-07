import test from 'ava';
import { html } from './respond.js';

function mock() {
    const results = {};

    return {
        req: {},
        res: {
            writeHead(code, headers) {
                results.writeHead = {
                    code,
                    headers,
                };
            },
            end(content) {
                results.end = {
                    content,
                };
            },
        },
        results,
    };
}

test('html - string template - should render as expected when input is valid', (t) => {
    const { req, res, results } = mock();
    const str = '<h1>Hello World</h1>';

    html(req, res, str);

    t.is(results.writeHead.code, 200);
    t.is(results.writeHead.headers['Content-Type'], 'text/html');
    t.is(results.end.content, str);
});

test('html - string template - should render empty when input is invalid', (t) => {
    const { req, res, results } = mock();
    const str = undefined;

    html(req, res, str);

    t.is(results.writeHead.code, 200);
    t.is(results.writeHead.headers['Content-Type'], 'text/html');
    t.is(results.end.content, '');
});

test('html - template file - should render file when it exists inside template directory', async (t) => {
    const { req, res, results } = mock();
    const options = {
        template: 'index.html',
    };

    await html(req, res, options);

    t.is(results.writeHead.code, 200);
    t.is(results.writeHead.headers['Content-Type'], 'text/html');
    t.assert(results.end.content.length > 0);
});

test('html - template file - should set status code to 500 when file does not exist in template directory', async (t) => {
    const { req, res, results } = mock();
    const options = {
        template: 'foo.html',
    };

    await html(req, res, options);

    t.assert(results.end.content.length > 0);
    t.is(results.writeHead.code, 500);
    t.is(results.writeHead.headers['Content-Type'], 'text/html');
});

test('html - template file - should render empty when given invalid options', async (t) => {
    const { req, res, results } = mock();
    const options = {
        invalid: 'foo.html',
    };

    await html(req, res, options);

    t.assert(results.end.content.length === 0);
    t.is(results.writeHead.code, 200);
    t.is(results.writeHead.headers['Content-Type'], 'text/html');
});
