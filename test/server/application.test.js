import http from 'node:http';
import application from '../../src/server/application.js';
import { test } from 'uvu';
import * as assert from 'uvu/assert';

const makeRequestOptions = {
  host: 'localhost',
  port: 8080,
  method: 'GET',
};

function makeRequest(
  options = { ...makeRequestOptions },
  callback
) {
  return http.request(options, (response) => {
    callback && callback(response);
  });
}

test('is a function', () => {
  assert.type(application, 'function');
});

test('exposes server object', () => {
  const app = application();
  assert.type(app.server, 'object');
});

test('has run method', () => {
  const app = application();
  assert.type(app.run, 'function');
});

test('exposes method for registering request handlers', () => {
  const app = application();
  assert.type(app.use, 'function');
});

test('successfully overrides default configuration', () => {
  const app = application({ port: 8000 });
  app.use((_, response) => {
    assert.ok(response.statusCode);
    assert.equal(response.statusCode, 200);
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

test('successfully listens on default port', () => {
  const app = application();
  app.use((_, response) => {
    assert.equal(response.statusCode, 200);
    response.end();
  });
  app.run(() => {
    const request = makeRequest(null, (response) => {
      assert.ok(response);
      assert.equal(response.statusCode, 200);
    });
    request.end();
    app.server.close();
  });
});

test.run();
