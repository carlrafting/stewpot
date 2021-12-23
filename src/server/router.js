class NotFound extends Error {
  constructor(...params) {
    super(...params);
    this.statusCode = 404;
    this.text = 'Not Found';
  }
}

const defaultConfig = {
  trailingSlashes: false
}

const httpMethodsToVerbs = {
  post: 'create',
  get: 'index',
  put: 'update',
  delete: 'delete'
};

export default function useRouter(config={ ...defaultConfig }) {
  const routes = new Map();

  // console.log({ config });

  function createRoutePathname(name) {
    const { trailingSlashes } = config;
    if (typeof name !== 'string') throw new Error('Name must be a string value!');
    return name === 'root' ? '/' : (
      trailingSlashes ? `/${name}/` : `/${name}`
    );
  }

  function add(
    method = 'GET',
    name = 'root',
    // pathname = '/',
    callback = (_, response) => {
      response.end();
    }
  ) {
    // let pathname;
    // if (name.includes('/')) {
    //   pathname = name;
    // }

    const props = {
      name: `${name}_${httpMethodsToVerbs[method]}`,
      method: method.toUpperCase(),
      pathname: createRoutePathname(name),
      callback,
    };

    const routeExists = routes.has(name) && routes.get(name);
  
    if (routeExists) {
      routeExists.forEach((item) => {
        // console.log({ item });
        if (item.method === props.method && item.name === props.name) {
          throw new Error(`A route already exist with that name and method!`);
        }
      });
      // console.log({ routeExists });
      routeExists.push(props);
      return api;
    }
  
    !routeExists && routes.set(name, [props]);
  
    return api;
  }

  function find(url) {
    for (const route of routes) {
      const [name, items] = route;
      for (const item of items) {
        if (url === item.pathname) {
          return item;
        }
      }
    }
  }
  
  function route(request, response) {
    const { url } = request;
    const match = find(url);
    // console.log({match});
    if (match) {
      return match.callback(request, response);
    }
  }
  
  function pathname(name, method) {
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
  }
  
  function clear() {
    routes.clear();
  }
  
  function inspect() {
    return routes;
  }  

  const api = {
    add,
    route,
    find,
    pathname,
    clear() {
      clear();
      return api;
    },
    inspect() {
      inspect();
      return api;
    },
  };

  Object.keys(httpMethodsToVerbs).forEach((method) => {
    const addMethodRoute = (name, ...rest) => {
      add(method, name, ...rest);
      return api;
    };
    if (!api.hasOwnProperty(method)) {
      api[method] = addMethodRoute;
    }
  });

  // console.log({ api });

  // api.get('root', () => {});
  // api.post('root', () => {});
  // api.get('foo',  () => {});
  // api.post('foo', () => {});
  // api.get('welcome');
  // api.post('welcome');

  // const rootPath = api.pathname('root', 'get');
  // console.log({ rootPath });

  // console.log(routes);

  return {
    ...api
  };
};

// useRouter();
