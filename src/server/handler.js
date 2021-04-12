import chalk from 'chalk';
import serveStatic from './static.js';

export default function handler(request, response) {
  const timestamp = new Date().toTimeString();
  console.log(`[${timestamp}] - ${chalk.bold(response.statusCode)} - ${chalk.blue(request.method)} - ${chalk.white(request.url)}`);

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

  if (request.method === 'GET' && request.url === '/echo') {
    response.writeHead(200, {
      'Content-Type': 'text/html'
    });
    // response.write();
    return response.end('<h1>Hello World!</h1>');
  }
  if (request.method === 'GET' && request.url === '/') {
    response.writeHead(200, {
      'Content-Type': 'text/html'
    });
    // response.write();
    return response.end('<h1>Hello from ROOT path!</h1>');
  }
  else {
    serveStatic(request, response);
  }
}
