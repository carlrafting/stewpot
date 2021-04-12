import process from 'process';
// import os from 'os';
import http from 'http';
import { pathToFileURL } from 'url';
// import https from 'https';
import handler from './handler.js';
import defaultConfig from '../config/stewpot.config.js';
import { projectConfigPath } from '../utils/paths.js';

function getServerConfig() {
  import(pathToFileURL(projectConfigPath))
    .then(c => console.log(c))
    .catch(err => console.error(err));

  if (typeof defaultConfig === 'function') {
    return defaultConfig().server;
  }
  
  return defaultConfig.server;
}

export default function () {
  const config = {
    ...getServerConfig()
  };
  const server = http.createServer();
  const portCheck = (config) => (config.port === 80 || config.port === 443);
  const configExtra = portCheck(config) ? {
    exclusive: true,
    readableAll: true,
    writeableAll: true
  } : {};
  
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

  return server;
}

