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

console.log('foo', addSlash('foo'));
console.log('/foo', addSlash('/foo'));
console.log('/', addSlash('/'));

export default function router(config = { ...defaultConfig }) {
  const routes = [];

  // console.log({ config });

  const api = {
    add(
      method = 'GET',
      route = '/',
      handler = (_, response) => {
        response.end();
      }
    ) {
      routes.push({
        method,
        route,
        handler,
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
          type: 'middleware',
        });
      } else {
        routes.push({
          route: '/',
          handlers: [base, ...handlers],
          type: 'middleware',
        });
      }
    },

    // register routes for use in application
    register() {
      return routes.map((route) => console.log(route));
    },

    find(method, url) {
      for (const route of routes) {
        const [name, items] = route;
        for (const item of items) {
          if (url === item.route) {
            return item;
          }
        }
      }
    },

    route(request, response) {
      const { method, url } = request;
      const match = find(method, url);
      // console.log({match});
      if (match) {
        return match.callback(request, response);
      }
    },

    pathname(name, method) {
      for (const route of routes) {
        // console.log({route});
        const [routeName, items] = route;
        if (name === routeName) {
          // return item.pathname;
          for (const item of items) {
            // console.log({item})
            if (item.method === method.toUpperCase()) {
              return item.pathname;
            }
          }
        }
      }
    },

    clear() {
      routes.clear();
      return api;
    },

    routes() {
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

  console.log({ api });
  // console.log(routes);

  return {
    ...api,
  };
}

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

// const rootPath = routes.pathname('root', 'get');
// console.log({ rootPath });
