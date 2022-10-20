const APP_ENV = process.env.NODE_ENV || 'development';
import { parse } from 'regexparam';
import * as url from 'stewpot/url';
import { headers } from './respond.js';
import { createError } from './error.js';
import { STATUS_CODES } from 'node:http';

export const methods = [
    'GET',
    'HEAD',
    'POST',
    'PUT',
    'DELETE',
    'CONNECT',
    'OPTIONS',
    'TRACE',
    'PATCH',
];

export default function router() {
    const routes = [];

    const api = {
        /**
         * add
         *
         * @param {string} method - http method string
         * @param {string} route - route url pattern
         * @param  {...function} handlers - request handlers for route
         * @returns {api}
         */
        add(method = 'GET', route = '/', ...handlers) {
            routes.push({
                method,
                route,
                handlers,
                type: 'route',
            });

            return api;
        },

        /**
         * addMiddleware
         *
         * @param  {...function|string} args - base path or middleware request handlers
         * @returns {api}
         */
        addMiddleware(...args) {
            const [base] = args;
            const handlers = [...args.slice(1)];

            if (typeof base === 'string') {
                routes.push({
                    route: base,
                    handlers,
                    method: '',
                    type: 'middleware',
                });

                return api;
            }

            routes.push({
                route: '/',
                handlers: [base, ...handlers],
                method: '',
                type: 'middleware',
            });

            return api;
        },

        /**
         * find
         *
         * @param {string} method - http method string
         * @param {string} url - request url
         * @returns {undefined}
         */
        find(method, url) {
            let matches = [],
                params = {},
                handlers = [],
                middleware = [],
                i = 0;

            for (const item of routes) {
                const { keys, pattern } = (() => {
                    if (item.type === 'route') {
                        return parse(item.route);
                    }
                    if (item.type === 'middleware') {
                        return parse(item.route, true);
                    }
                })();

                if (
                    item.method === '' ||
                    item.method === method ||
                    item.method === 'GET'
                ) {
                    matches = pattern.exec(url);

                    if (matches === null) {
                        continue;
                    }

                    if (!keys) {
                        if (matches.groups) {
                            for (const key of matches.groups) {
                                params[key] = matches.groups[key];
                            }
                        }
                    }

                    if (keys && keys.length > 0) {
                        for (i = 0; i < keys.length; ) {
                            params[keys[i]] = matches[++i];
                        }
                    }

                    if (matches || pattern.test(url)) {
                        if (item.method === '') {
                            item.handlers.length > 1
                                ? (middleware = [...item.handlers])
                                : middleware.push(...item.handlers);
                            // return;
                        } else {
                            item.handlers.length > 1
                                ? (handlers = [...item.handlers])
                                : handlers.push(...item.handlers);
                        }
                    }

                    /*(matches || pattern.test(url)) &&
                        (item.handlers.length > 1
                            ? (handlers = [...item.handlers])
                            : handlers.push(...item.handlers));*/
                }
            }

            if (handlers.length === 0) {
                // throw notFound('Not Found!');
                const statusCode = 404;
                throw createError(statusCode, STATUS_CODES[statusCode]);
            }

            return { params, handlers, middleware };
        },

        /**
         * params
         *
         * @param {IncomingMessage} req - request object
         * @returns {object} params
         */
        params(req) {
            const { method } = req;
            const _url = url.parse(req);

            try {
                const { params } = api.find(method, _url.pathname);

                if (Object.keys(params).length > 0) {
                    return {
                        ...params,
                    };
                }
            } catch (err) {} // eslint-disable-line

            return {};
        },

        /**
         * 
         * @param {IncomingMessage} req - node.js request object
         * @param {ServerResponse} res - node.js response object
         * @returns {undefined}
         */
        handler(req, res) {
            const { method } = req;
            const _url = url.parse(req);

            try {
                const { handlers } = api.find(method, _url.pathname);

                const middleware = [];

                // loop through handlers
                for (const handler of handlers) {
                    // filter stack for middleware
                    const mws = routes.filter((item) => item.method === '');
                    // loop through middleware
                    for (const mw of mws) {
                        // parse middleware route
                        const route = parse(mw.route, true);
                        // does middleware route match current url?
                        const match = _url.pathname.match(route.pattern);
                        if (match) {
                            // if we find a match push middleware to temporary middleware array.
                            middleware.push(mw);
                        }
                    }
                    const applyHandler = () => {
                        // loop through and execute middleware if there are any
                        middleware.length > 0 &&
                            middleware.map((item) => {
                                Array.isArray(item.handlers)
                                    ? item.handlers.map((h) => h(req, res))
                                    : item.handlers(req, res);
                            });
                        // execute route handler
                        handler && handler(req, res);
                    };
                    applyHandler();
                }
            } catch (err) {
                console.error(err.stack);
                headers(res, err.statusCode, 'html');
                res.end(
                    `
                        <!doctype html>
                        <html lang="en">
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>${err.message}</title>
                        <h1>${err.statusCode} ${err.message}</h1>
                        ${
                            APP_ENV === 'development'
                                ? `<pre>${err.stack}</pre>`
                                : ''
                        }
                    `.trim()
                );
                return;
            }
        },

        get routes() {
            return routes;
        },
    };

    // alias addMiddleware as use
    api.use = api.addMiddleware;

    // methods for http methods
    for (const m of methods) {
        if (!Object.hasOwn(api, m)) {
            api[m.toLowerCase()] = (n, cb) => {
                api.add(m, n, cb);
                return api;
            };
        }
    }

    return {
        ...api,
    };
}
