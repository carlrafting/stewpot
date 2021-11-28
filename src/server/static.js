import { create } from 'domain';
import fs from 'fs';
// import { IncomingMessage, ServerResponse } from 'http';
import http from 'http';
import path from 'path';
import mimeTypes from './mime_types.js';

function createError(error, response) {
  if (error) {
    if(error.code === 'ENOENT') {
      // fs.readFile('./404.html', function(error, content) {
      //   response.writeHead(404, { 'Content-Type': mimeTypes['.html'] });
      //   return response.end(content, 'utf-8');
      // });
      const code = 404;
      const message = `${code} ${http.STATUS_CODES[code]}`;
      response.writeHead(code, {
        'Content-Type': mimeTypes['.html']
      });
      return response.end(message);
    }
    else {
      const message = `Server Error: ${error.code} \n`;
      throw new Error(message, 500);
    }
  }
}

async function rootExistsInWorkingDirectory(root) {
  return (
    await fs.promises.access(`./${root}`, fs.constants.F_OK, (err) => {
      return err ? false : true;
    })
  );
}

/**
 * serveStatic
 * 
 * This code is adapted from https://developer.mozilla.org/en-US/docs/Learn/Server-side/Node_server_without_framework
 * 
 * @param {IncomingMessage} request
 * @param {ServerResponse} response
 */
export default async function serveStatic(request, response, options={
  root: 'public'
}) {
  const { url } = request;
  const { root } = options;
  console.log({ url });
  let filePath = `${root}${request.url}`;
  console.log({ filePath });
  if (filePath === `${filePath}`) {
    filePath = `${filePath}index.html`;
  }
  console.log({ filePath });

  const rootExists = await rootExistsInWorkingDirectory(options.root);
  console.log({ rootExists });

  if (!rootExists) {
    return response.end(0);
  }

  fs.stat('./' + filePath, (err, stats) => {
    if (stats.isFile()) {
      const extname = `${path.extname(filePath)}`.toLowerCase();
      const contentType = mimeTypes[extname] || 'application/octet-stream';
    
      return fs.readFile('./' + filePath, function(error, content) {
        if (error) {
          return createError(error, response);
        }
        
        response.writeHead(200, { 'Content-Type': contentType });
        return response.end(content, 'utf-8');
      });
    }

    if (err) {
      return createError(err, response);
    }

    return response.end();
  });
}
