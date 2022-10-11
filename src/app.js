import defaultHandler from './server/default_handler.js';
import http from 'node:http';

const app = defaultHandler();

http.createServer().listen(80, 'localhost').on('request', app.handler);
