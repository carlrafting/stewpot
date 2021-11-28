import chalk from 'chalk';
import serveStatic from './static.js';
import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

/**
 * Server handler 
 * 
 * @param {IncomingMessage} request 
 * @param {ServerResponse} response 
 * @returns 
 */
export default function handler(request, response) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] - ${chalk.bold(response.statusCode)} - ${chalk.blue(request.method)} - ${chalk.white(request.url)}`);

  const url = new URL(request.url, `http://${request.headers.host}`);
  console.log('url', url);
  
  request
    .on('error', (err) => {
      console.error(err);
    })
    .on('abort', (arg) => {
      console.log('Aborted Request!', arg);
      // response.end();
    })
    .on('close', () => {
      console.log('Closed Request!');
      // response.end();
    });

  response
    .on('error', (err) => {
      console.error(err);
    })
    .on('close', () => {
      console.log('Response Closed!');
    })
    .on('finish', () => {
      console.log('Response Finished!');
    });

  if (request.method === 'GET') {
    response.writeHead(200, {
      'Content-Type': 'text/html'
    });
  }

  if (request.method === 'GET' && request.url === '/echo') {
    return response.end('<h1>Hello World!</h1>');
  }
  if (request.method === 'GET' && request.url === '/') {
    return response.end('<h1>Hello from ROOT path!</h1>');
  }
  else {
    try {
      serveStatic(request, response);
    } catch (error) {
      console.error(error);
    }
  }
}
