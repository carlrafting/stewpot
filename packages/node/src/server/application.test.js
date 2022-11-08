import http from 'node:http';
import application from 'stewpot/app';
import test from 'ava';

const makeRequestOptions = {
    host: 'localhost',
    port: 8080,
    method: 'GET',
};

function makeRequest(options = { ...makeRequestOptions }, callback) {
    return http.request(options, (response) => {
        callback && callback(response);
    });
}

test('is a function', (t) => {
    t.assert(typeof application, 'function');
});

test('exposes server object', (t) => {
    const app = application();
    t.assert(typeof app.server, 'object');
});

test('has run method', (t) => {
    const app = application();
    t.assert(typeof app.run, 'function');
});

test('exposes method for registering request handlers', (t) => {
    const app = application();
    t.assert(typeof app.use, 'function');
});

test.skip('successfully overrides default configuration', (t) => {
    const app = application({ port: 8000 });
    app.use((_, response) => {
        t.ok(response.statusCode);
        t.is(response.statusCode, 200);
        response.end();
    });
    app.run(() => {
        const request = makeRequest({
            host: 'localhost',
            port: 8000,
            method: 'GET',
        });
        request.end();
        app.server.close();
    });
});

test.skip('successfully listens on default port', (t) => {
    const app = application();
    app.use((_, response) => {
        t.is(response.statusCode, 200);
        response.end();
    });
    app.run(() => {
        const request = makeRequest(null, (response) => {
            t.ok(response);
            t.is(response.statusCode, 200);
        });
        request.end();
        app.server.close();
    });
});
