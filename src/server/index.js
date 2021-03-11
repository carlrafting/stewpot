import chalk from 'chalk';
import process from 'process';
import os from 'os';
import http from 'http';
import https from 'https';

const { constants: {signals: { SIGINT }} } = os;

const config = {
  port: 8080,
  host: 'localhost'
};

const server = http.createServer((request, response) => {
  // console.log(request);
  // console.log(response);

  request
    .on('error', (err) => {
      console.error(err);
    })
    .on('abort', () => {
      console.log('Aborted Request!')
      response.end();
    })
    .on('close', () => {
      console.log('Closed Request!')
      response.end();
    });
  
  response
    .on('error', (err) => {
      console.error(err);
    })
    .on('close', () => {
      console.log('Response Closed!')
    })
    .on('finish', () => {
      console.log('Response Finished!')
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
    const code = 404;
    const message = `${code} ${http.STATUS_CODES[404]}`;
    response.writeHead(code, {
      'Content-Type': 'text/html'
    });
    response.end(message);
  }
});

const portCheck = (config) => (config.port === 80 || config.port === 443);

const configExtra = {
  exclusive: portCheck(config),
  readableAll: portCheck(config),
  writeableAll: portCheck(config)
};

console.log(config);
console.log(configExtra);

server
  .listen({
    ...config,
    ...configExtra
  }, 
  () => {
    console.log(`Started web server at ${config.host}:${config.port}`);
  })
  .on('close', () => {
    console.log('\n Shutting down web server...');
  })
  .on('request', (request, response) => {
    const timestamp = new Date().toTimeString();
    console.log(`[${timestamp}] - ${chalk.bold(response.statusCode)} - ${chalk.blue(request.method)} - ${chalk.white(request.url)}`);
  });

function signalHandler(signal) {
  console.log(`Recieved ${signal}`);
  server.close();
}

process
  .on('SIGINT', signalHandler)
  .on('SIGTERM', signalHandler);
