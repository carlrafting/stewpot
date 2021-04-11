import process from 'process';
// import os from 'os';
import http from 'http';
// import https from 'https';
import handler from './handler.js';

const config = {
  port: 80,
  host: 'localhost'
};

const server = http.createServer();

const portCheck = (config) => (config.port === 80 || config.port === 443);

const configExtra = {
  exclusive: portCheck(config),
  readableAll: portCheck(config),
  writeableAll: portCheck(config)
};

server
  .listen({
    ...config,
    ...configExtra
  }, 
  () => {
    console.log(`Started web server at ${config.host}:${config.port}`);
  })
  .on('close', () => {
    setTimeout(() => {
      console.log('\n Shutting down web server...');
    }, 0);
  })
  .on('request', handler);

function signalHandler(signal) {
  console.log(`Recieved ${signal}`);
  server.close();
}

process
  .on('SIGINT', signalHandler)
  .on('SIGTERM', signalHandler);
