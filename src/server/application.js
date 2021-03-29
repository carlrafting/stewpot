import http from 'http';
import https from 'https';
import chalk from 'chalk';
import process from 'process';
import url from 'url';
import { defaultConfigURL } from '../utils/paths.js';

// const _config = {
//   port: 80,
//   host: 'localhost'
// };

console.log('defaultConfigURL', defaultConfigURL);

const _config = import(defaultConfigURL).then(module => {
  console.log('_config module import', module);

  if (module.default) {
    if (typeof module.default === 'function') {
      return module.default();
    }

    return module.default;
  }

  return module;
}).catch(err => console.log('err', err));

console.log('_config', _config);

const portCheck = (config) => (config.port === 80 || config.port === 443);

const configExtra = {
  exclusive: portCheck(_config),
  readableAll: portCheck(_config),
  writeableAll: portCheck(_config)
};

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

export default async (config={ ..._config }) => {
  // if (Object.keys(_config).length === 0) {
  //   throw new Error('Default config not loaded!');
  // } 
  
  const server = createServer({ ...config });

  // console.log(_config.default);

  const mergedConfigValues = {
    ..._config,
    ...configExtra,
    ...config
  };

  console.log(mergedConfigValues);
  
  server.on('request', handler);
  
  server.on('close', () => {
    console.log('Shutting down web server...');
  });

  function run() {
    server.listen({
      ...mergedConfigValues
    }, 
    () => {
      console.log(`Started web server at ${config.host}:${config.port}`);
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
    config,
    run
  };
};
