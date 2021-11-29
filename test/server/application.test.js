import http from 'node:http';
import application from '../../src/server/application.js';
import { test } from 'uvu';
import * as assert from 'uvu/assert';

function makeRequest(options, callback) {
  return http.request(options || {
    host: 'localhost',
    port: 8080,
    method: 'GET'
  }, (response) => {
    callback && callback(response)
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
  application({
    server: {
      port: 8000
    }
  }, (request, response) => {
    console.log(request);
    assert.ok(response.statusCode);
    assert.equal(response.statusCode, 200);
  }).run(() => {
    request.end();
  })
  const request = makeRequest({
    host: 'localhost',
    port: 8000,
    method: 'GET'
  });
});

test('successfully listens on default port', () => {
  const app = application(null, (request, response) => {
    assert.equal(response.statusCode, 200);
    response.end() && app.close();
  });
  app.run(() => {
    request.end();
  });
  const request = makeRequest(null, (response) => {
    assert.ok(response);
    assert.equal(response.statusCode, 200);
  });
});
