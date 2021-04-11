import fs from 'fs';
// import { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import mimeTypes from './mime_types.js';

/**
 * serveStatic
 * 
 * This code is adapted from https://developer.mozilla.org/en-US/docs/Learn/Server-side/Node_server_without_framework
 * 
 * @param {IncomingMessage} request
 * @param {ServerResponse} response
 */
export default function serveStatic(request, response) {
  let filePath = '.' + request.url;
  if (filePath == './') {
    filePath = './index.html';
  }

  const extname = `${path.extname(filePath)}`.toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, function(error, content) {
    if (error) {
      if(error.code === 'ENOENT') {
        fs.readFile('./404.html', function(error, content) {
          response.writeHead(404, { 'Content-Type': mimeTypes['.html'] });
          return response.end(content, 'utf-8');
        });
      }
      else {
        const message = `Server Error: ${error.code} \n`;
        throw new Error(message, 500);
      }
    }
    else {
      response.writeHead(200, { 'Content-Type': contentType });
      return response.end(content, 'utf-8');
    }
  });
}
