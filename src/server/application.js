import http from 'node:http';
import https from 'node:https';
import process from 'node:process';
import defaultConfig from '../config/stewpot.config.js';
import defaultHandler from './default_handler.js';

const portCheck = (config) => config.port === 80 || config.port === 443;

const defaultServerConfig =
    typeof defaultConfig === 'function'
        ? defaultConfig().server
        : defaultConfig.server;

const createServer = (config) =>
    config.https ? https.createServer() : http.createServer();

export default function stewpot(config = {}) {
    const { http, https, port, host } = {
        ...defaultServerConfig,
        ...config,
    };

    const server = createServer({ https });

    function signalHandler(signal) {
        console.log(`Recieved ${signal}`);
        server.close(() => console.log('Closing server connection...'));
        process.exit(0);
    }

    process.on('SIGINT', signalHandler).on('SIGTERM', signalHandler);

    const handlers = [];
    const middleware = [];

    const api = {
        config: {
            https,
            http,
            port,
            host,
        },

        server,

        use(...args) {
            const l = args.length;

            if (l > 0) {
                for (const arg of args) {
                    const base = typeof arg === 'string' ? arg : '/';
                    // const fns = args.slice(1);
                    /*
                    if (typeof arg === 'object') {
                        const { method, route, handler, handlers, type } = arg;
                        middleware.push({
                            method,
                            route,
                            handler,
                            handlers,
                            type,
                        });
                    }
                    */
                    if (typeof arg === 'function') {
                        const handler = arg;
                        // handlers.push(base, arg);
                        handlers.push({ base, handler });
                    }
                }
            }

            return api;
        },

        handler() {},

        render() {},

        run(callback) {
            if (handlers.length > 0) {
                for (const { handler } of handlers) {
                    if (typeof handler === 'function') {
                        server.on('request', handler);
                    }
                }
            }

            // register default request handler if none were defined with use(...fns)
            if (handlers.length === 0 && middleware.length === 0) {
                const { handler } = defaultHandler();
                server.on('request', handler);
            }

            return server.listen(
                port,
                host,
                callback
                    ? callback
                    : () => {
                          console.log(
                              `=> Started web server at ${
                                  https ? 'https://' : 'http://'
                              }${host}${
                                  [80, 443].includes(port) === false
                                      ? `:${port}`
                                      : ''
                              }`
                          );
                      }
            );
        },
    };

    // Alias
    api.listen = api.run;

    return { ...api };
}
