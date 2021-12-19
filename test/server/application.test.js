import http from 'node:http';
import application from '../../src/server/application.js';
import { test } from 'uvu';
import * as assert from 'uvu/assert';

function makeRequest(
  options = {
    host: 'localhost',
    port: 8080,
    method: 'GET',
  },
  callback
) {
  return http.request(options, (response) => {
    callback && callback(response);
  });
}

test('is a function', () => {
  assert.type(application, 'function');
});

test('has run method', () => {
  const app = application();
  assert.type(app.run, 'function');
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
    process.exit(0);
  });
});

test('successfully listens on default port', () => {
  const app = application();
  const handler = app.use((_, response) => {
    assert.equal(response.statusCode, 200);
    response.end() && handler.close();
  });
  app.run(() => {
    const request = makeRequest({}, (response) => {
      assert.ok(response);
      assert.equal(response.statusCode, 200);
    });
    request.end();
  });
});
