import http from 'http';
import https from 'https';
import chalk from 'chalk';
import process from 'process';
// import url from 'url';
import defaultConfig from '../config/stewpot.config.js';

// default server config object
let _config;

if (typeof defaultConfig === 'function') {
  _config = defaultConfig().server;
} else {
  _config = defaultConfig.server;
}

const portCheck = (config) => (config.port === 80 || config.port === 443);

function createServer(config) {
  return config.https ? https.createServer() : http.createServer();
}

function handler(req, res) {
  const timestamp = new Date().toTimeString();
  console.log(`[${timestamp}] - ${chalk.bold(res.statusCode)} - ${chalk.blue(req.method)} - ${chalk.white(req.url)}`);
  res.end('Hello World');
}

function validateConfig(config) {
  const hasKeys = Object.keys(config).length > 0;
  let obj = {};

  if (hasKeys) {
    for (const key in _config) {
      if (Object.prototype.hasOwnProperty.call(config, key)) {
        console.log(key);
        obj[key] = config[key];
      }
  
      throw new Error(`Config value not valid`);
    }
  }
}

export default (config={ ..._config }) => {
  if (Object.keys(config).length === 0) {
    throw new Error('No configuration values detected!');
  }

  const configExtra = {
    exclusive: portCheck(config),
    readableAll: portCheck(config),
    writeableAll: portCheck(config)
  };
  
  const server = createServer({ ...config });

  const mergedConfigValues = {
    ..._config,
    ...config,
    ...configExtra
  };

  console.log('mergedConfigValues', mergedConfigValues);
  
  server.on('request', handler);
  
  server.on('close', () => {
    console.log('Shutting down web server...');
  });

  function use() {

  }

  function run() {
    server.listen({
      ...mergedConfigValues
    }, 
    () => {
      console.log(`Started web server at ${mergedConfigValues.host}:${mergedConfigValues.port}`);
    });
  }

  function signalHandler(signal) {
    console.log(`Recieved ${signal}`);
    server.close();
  }
  
  process
    .on('SIGINT', signalHandler)
    .on('SIGTERM', signalHandler);

  return {
    config: mergedConfigValues,
    use,
    run
  };
};
