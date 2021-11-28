const routes = new Map();

export function add(name, method = "GET", pathname = "/", callback = () => {}) {
  const route = routes.has(name) && routes.get(name);

  if (route || route.method === method) {
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
  // console.log('[find]', {url});
  for (const route of routes) {
    const [name, entry] = route;
    // console.log({ name, entry });
    if (url === entry.pathname) {
      // console.log('[find][match]', { route });
      return route;
    }
  }
}

export function route(request, response) {
  const { url } = request;
  // console.log('[route]', { url });
  const match = find(url);
  // console.log('[route]', { match });
  if (match) {
    const [name, route] = match;
    return route.callback(request, response);
  }
  !match && (() => {
    throw new Error(`No matching route found for ${url}.`)
  })();
}

export function pathname(name) {
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
  }
};

export default api;
