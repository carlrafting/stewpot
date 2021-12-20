const routes = new Map();

class NotFound extends Error {
  constructor(...params) {
    super(...params);
    this.statusCode = 404;
    this.text = 'Not Found';
  }
}

export function add(
  name = 'root',
  method = 'GET',
  pathname = '/',
  callback = () => {}
) {
  const routeExists = routes.has(name);

  if (routeExists) {
    throw new Error(`The route you're trying to add already exists!`);
  }

  routes.set(name, {
    name,
    method: method.toUpperCase(),
    pathname,
    callback,
  });

  return api;
}

export function find(url) {
  for (const route of routes) {
    const [, entry] = route;
    if (url === entry.pathname) {
      return route;
    }
  }
}

export function route(request, response) {
  const { url } = request;
  const match = find(url);
  if (match) {
    const [name, route] = match;
    return route.callback(request, response);
  }
  // !match && (() => {
  //   throw new NotFound(`No matching route found for ${url}.`)
  // })();
}

export function pathname() {
  for (const route of routes) {
    const [name, entry] = route;
    if (name === name) {
      return entry.pathname;
    }
  }
}

export function clear() {
  routes.clear();
}

export function inspect() {
  return routes;
}

const api = {
  add,
  get(name, pathname, ...rest) {
    add(name, 'GET', pathname, ...rest);
    return api;
  },
  post(name, pathname, ...rest) {
    add(name, 'POST', pathname, ...rest);
    return api;
  },
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

export default api;
