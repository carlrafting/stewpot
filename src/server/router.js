import { parse } from 'regexparam';

const defaultConfig = {
    trailingSlashes: false,
};

const methods = [
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

const addSlash = (str) => (str.charAt(0) === '/' ? str : `/${str}`);
/*
console.log('foo', addSlash('foo'));
console.log('/foo', addSlash('/foo'));
console.log('/', addSlash('/'));
// */
export default function router(config = { ...defaultConfig }) {
    const routes = [];

    // console.log({ config });

    const api = {
        add(method = 'GET', route = '/', ...handlers) {
            routes.push({
                method,
                route,
                handlers,
                type: 'route',
            });

            return api;
        },

        addMiddleware(...args) {
            const [base] = args;
            const handlers = [...args.slice(1)];

            console.log(base, handlers);

            if (typeof base === 'string') {
                routes.push({
                    route: base,
                    handlers,
                    method: '',
                    type: 'middleware',
                });
            } else {
                routes.push({
                    route: '/',
                    handlers: [base, ...handlers],
                    method: '',
                    type: 'middleware',
                });
            }

            return api;
        },

        find(method, url) {
            let matches = [],
                params = {},
                handlers = [],
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

                console.log({
                    keys,
                    pattern,
                });

                if (
                    item.method.length === 0 ||
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

                    (matches || pattern.test(url)) &&
                        (item.handlers.length > 1
                            ? (handlers = [...item.handlers])
                            : handlers.push(...item.handlers));
                }
            }

            return { params, handlers };
        },

        route(request, response) {
            const { method, url } = request;
            const match = find(method, url);
            // console.log({match});
            if (match) {
                return match.callback(request, response);
            }
        },

        clear() {
            routes.clear();
            return api;
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

    // console.log({ api });
    // console.log(routes);

    return {
        ...api,
    };
}
/*
const routes = router();
routes.get('root', () => {});
routes.post('root', () => {});
routes.get('foo', () => {});
routes.post('foo', () => {});
routes.get('welcome');
routes.post('welcome');
routes.get('foo/bar', () => {});
routes.post('foo/bar', () => {});
routes.get('posts/:id', () => {});
routes.get('posts/:id', () => {});

routes.addMiddleware(
    '/foo',
    function first() {},
    function second() {}
);

routes.addMiddleware(
    function one() {},
    function two() {}
);
console.log('register', routes.register());

console.log('routes', ...routes.routes());
*/
// const rootPath = routes.pathname('root', 'get');
// console.log({ rootPath });
