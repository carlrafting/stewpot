import http from 'node:http';
import https from 'node:https';
import process from 'node:process';
import defaultConfig from '../config/stewpot.config.js';
import defaultHandler from './default_handler.js';
import Module from 'node:module';

console.log(Module);

const portCheck = (config) => config.port === 80 || config.port === 443;

const createServer = (config) =>
  config.https ? https.createServer() : http.createServer();

export default function stewpot(config = {}) {
  const { configMerged } = init(config);

  const server = createServer({ ...configMerged });

  server.on('close', () => {
    console.log('Shutting down web server...');
    process.exit(0);
  });

  function signalHandler(signal) {
    console.log(`Recieved ${signal}`);
    server.close(() => console.log('Closing server connection...'));
    process.exit(0);
  }

  process.on('SIGINT', signalHandler).on('SIGTERM', signalHandler);

  const handlers = [];
  const middleware = [];

  function init(config) {
    console.log({ config });
    // if config parameter is set to null or empty object we have to reassign it.
    if (
      // !config ||
      typeof config === 'object' &&
      Object.keys(config).length === 0
    ) {
      config =
        typeof defaultConfig === 'function'
          ? defaultConfig().server
          : defaultConfig.server;
    }

    // if (typeof config === 'function') {
    //   config = config().server;
    // }

    // if (typeof config === 'object') {
    //   config = config.server;
    // }

    console.log({ config });

    // is this useful/necessary? not sure it's doing what i think it's doing...
    const configExtra = portCheck(config)
      ? {
          exclusive: true,
          readableAll: true,
          writeableAll: true,
        }
      : {};

    const configMerged = {
      ...defaultConfig.server,
      ...config,
      ...configExtra,
    };

    return {
      configMerged,
    };
  }

  const api = {
    config: configMerged,

    server,

    use(...args) {
      if (args.length > 0) {
        const base = typeof args[0] === 'string' ? args[0] : '/';

        for (const arg of args) {
          if (typeof arg === 'object') {
            const { method, route, handler, handlers, type } = arg;
            middleware.push({ method, route, handler, handlers, type });
          }
          if (typeof arg === 'function') {
            handlers.push(base, arg);
          }
        }
      }

      return api;
    },

    handler() {},

    run(callback) {
      console.log(handlers);

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
        callback
          ? callback
          : () => {
              console.log(
                `=> Started web server at ${
                  configMerged.https ? 'https://' : 'http://'
                }${configMerged.host}:${configMerged.port}`
              );
            }
      );
    },
  };

  // Alias
  api.listen = api.run;

  return { ...api };
}

const app = stewpot();
app.listen();
