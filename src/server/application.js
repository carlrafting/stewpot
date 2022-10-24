import http from 'node:http';
import https from 'node:https';
import process from 'node:process';
import defaultConfig from '../config/default.config.js';
import defaultHandler from './default_handler.js';

// const portCheck = (config) => config.port === 80 || config.port === 443;

const defaultServerConfig =
    typeof defaultConfig === 'function'
        ? defaultConfig().server
        : defaultConfig.server;

const createServer = (config) =>
    config.https ? https.createServer() : http.createServer();

async function run(req, res, fn) {
    try {
        const module = (await fn(req, res)) || fn(req, res);

        if (module === null) {
            res.statusCode = 204;
            res.end();
            return;
        }

        if (typeof module === 'string') {
            const code = res.statusCode || 200;
            res.statusCode = code;
            res.setHeader('Content-Length', Buffer.byteLength(module));
            res.end(module);
            return;
        }

        if (typeof module === 'object') {
            const json = JSON.stringify(module);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(json);
        }
    } catch (err) {
        if (err && err.stack) {
            if (err.statusCode) {
                res.statusCode = err.statusCode;
                res.end(err.message);
                return;
            }

            res.statusCode = 500;
            res.end('Internal Server Error!');

            console.error(err.stack);
        }
    }
}

export function mount(fn) {
    return (req, res) => run(req, res, fn);
}

function signalHandler(fn) {
    return (signal) => {
        console.log(`=> Signal: ${signal}`);
        fn && fn();
    };
}

export default function stewpot(config = {}) {
    const { http, https, port, host } = {
        ...defaultServerConfig,
        ...config,
    };

    const server = config.server || createServer({ https });
    const controller = config.controller || new AbortController();

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
            const shutdown = () => server.close();

            if (handlers.length > 0) {
                for (const { handler } of handlers) {
                    if (typeof handler === 'function') {
                        server.on('request', handler);
                    }
                }
            }

            if (handlers.length === 0 && middleware.length === 0) {
                const { handler } = defaultHandler();
                server.on('request', handler);
            }

            server.on('error', (err) => console.log(err));

            server.on('close', () => {
                console.log('=> Closing web server connection...');
                process.exit();
            });

            process
                .on('SIGINT', signalHandler(shutdown))
                .on('SIGTERM', signalHandler(shutdown))
                .on('exit', signalHandler(shutdown));

            return server.listen(
                {
                    port,
                    host,
                    signal: controller.signal,
                },
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
