import process from 'process';
// import os from 'os';
import http from 'http';
import { pathToFileURL } from 'url';
// import https from 'https';
import handler from './handler.js';
import defaultConfig from '../config/stewpot.config.js';
import { projectConfigPath } from '../utils/paths.js';

const defaultConfigFileCheck = () => (typeof defaultConfig === 'function' ? defaultConfig().server : defaultConfig.server);

async function getServerConfigFiles() {
  try {
    const projectConfig = await import(pathToFileURL(projectConfigPath)).catch(console.log);
    const projectConfigFileCheck = () => projectConfig ? (typeof projectConfig === 'function' ? projectConfig().server : projectConfig.server) : {};

    const config = {
      ...defaultConfigFileCheck(),
      ...projectConfigFileCheck()
    };

    return {
      ...config
    };
  } catch (err) {
    console.error(err);

    return {
      ...defaultConfigFileCheck()
    };
  }
}

export default function () {
  const config = {
    ...defaultConfigFileCheck()
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
        console.log('↳  Shutting down web server...');
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

