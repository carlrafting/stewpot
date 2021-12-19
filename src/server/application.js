import http from 'node:http';
import https from 'node:https';
import process from 'node:process';
import defaultConfig from '../config/stewpot.config.js';
import defaultHandler from './default_handler.js';

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

export default function stewpot(
  config = { ...defaultServerConfig }
) {
  // if config parameter is set to null or empty object we have to reassign it.
  if (
    !config ||
    (typeof config === 'object' && Object.keys(config).length === 0)
  ) {
    config = defaultServerConfig;
  }

  if (typeof config === 'function') {
    config = config();
  }

  // is this useful/necessary? not sure it's doing what i think it's doing...
  const configExtra = portCheck(config)
    ? {
        exclusive: true,
        readableAll: true,
        writeableAll: true,
      }
    : {};
  
  const configMerged = {
    ...defaultServerConfig,
    ...config,
    ...configExtra,
  };
    
  const server = createServer({ ...configMerged });

  server.on('close', () => {
    console.log('Shutting down web server...');
    process.exit(0);
  });

  const close = () => server.close();

  const handlers = [];

  function use(...fns) {
    if (fns.length > 0) {
      for (const handler of fns) {
        if (typeof handler === 'function') {
          handlers.push(handler);
        }
      }
    }

    return {
      run
    };
  }

  function run(callback) {
    if (handlers.length > 0) {
      for (const handler of handlers) {
        if (typeof handler === 'function') {
          server.on('request', handler);
        }
      }
    }

    // register default request handler if none were defined with use(...fns)
    handlers.length === 0 && server.on('request', defaultHandler);

    return server.listen(
      {
        ...configMerged,
      },
      callback ? callback : () => {
        console.log(
          `=> Started web server at ${configMerged.host}:${configMerged.port}`
        );
      }
    );
  }

  function signalHandler(signal) {
    console.log(`Recieved ${signal}`);
    server.close();
  }

  process
    .on('SIGINT', signalHandler)
    .on('SIGTERM', signalHandler);

  return {
    config: configMerged,
    use,
    run,
    close
  };
};
