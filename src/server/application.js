import http from 'http';
import https from 'https';
import chalk from 'chalk';
import process from 'process';
import defaultConfig from '../config/stewpot.config.js';
import defaultHandler from './handler.js';

// default server config object
let defaultServerConfig = (() => {
  if (typeof defaultConfig === 'function') {
    return defaultConfig().server;
  } else {
    return defaultConfig.server;
  }
})();

const portCheck = (config) => config.port === 80 || config.port === 443;

function createServer(config) {
  return config.https ? https.createServer() : http.createServer();
}

export default (
  config = { ...defaultServerConfig },
  handler = defaultHandler
) => {
  // if config parameter is set to null we have to reassign it.
  if (!config) {
    config = defaultConfig;
  }

  if (typeof config === 'function') {
    config = config();
  }

  if (Object.keys(config).length === 0) {
    throw new Error('No configuration values detected!');
  }

  // console.log('config', config);

  const configExtra = portCheck(config)
    ? {
        exclusive: true,
        readableAll: true,
        writeableAll: true,
      }
    : {};

  const server = createServer({ ...config });

  const configMerged = {
    ...defaultServerConfig,
    ...config.server,
    ...configExtra,
  };

  // console.log('configMerged', configMerged);

  server.on('request', handler);

  server.on('close', () => {
    console.log('Shutting down web server...');
    process.exit(0);
  });

  const close = () => server.close();

  function run(callback) {
    server.listen(
      {
        ...configMerged,
      },
      callback ? callback : () => {
        console.log(
          `Started web server at ${configMerged.host}:${configMerged.port}`
        );
      }
    );
  }

  function signalHandler(signal) {
    console.log(`Recieved ${signal}`);
    server.close();
  }

  process.on('SIGINT', signalHandler).on('SIGTERM', signalHandler);

  return {
    config: configMerged,
    run,
    close
  };
};
