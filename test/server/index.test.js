import { test } from 'uvu';
import server from '../../src/server/index.js';

test('server', function () {
  server();
});

test.run();
