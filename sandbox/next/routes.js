/** @typedef {Map<string, number>} */

const methods = new Map([
  ["GET", 1],
  ["POST", 2],
]);

/**
 * @typedef {string} ScopeKey
 */

/**
 * @typedef {number} ScopeValue
 */

/**
 * @constant scope
 * @typedef {Map<ScopeKey, ScopeValue>}
 */
const scopes = new Map([
  ["/", 1],
]);

/**
 * @typedef {Number} RouteIndex
 */

/**
 * @typedef {Object} RouteItem
 * @property {string} pathname
 * @property {URLPattern} pattern
 * @property {Number} method
 * @property {Array<Function>} handlers
 * @property {Number=} scope
 */

/**
 * @type {Map<RouteIndex, RouteItem>}
 */
export const map = new Map();

add("get", "/", function handler() {});
add("get", "/foo/:id", () => {}, () => {});

/**
 * add(method, pathname, ...handlers)
 *
 * @param {string} method
 * @param {string} pathname
 * @param  {...function} handlers
 */
export function add(method, pathname, ...handlers) {
  const scope = "/";
  map.set(map.size, {
    method: methods.get(method.toUpperCase()) || 0,
    pathname,
    pattern: new URLPattern({ pathname }),
    handlers,
    scope: scopes.get(scope),
  });
}

export function clear() {
  map.clear();
}

/*
console.log({
  methods,
  scopes,
  map,
}); // */

// console.log("routes map", map);

export function configure(scope = "/", fn) {
  scopes.get(scope);
  return () => fn();
}

const url = new URL("http://localhost");

/*
export function match(scope = "/", request = new Request(url)) {
  console.log({ request });
  const { method, url, headers } = request;
  const requestUrl = new URL(url);
  const routeMap = map;
  // console.log("routeMap", routeMap);
  // console.log("Request", req);
  // console.log("url", url, requestUrl);
  // console.log("method", method);
  // console.log("headers", headers);
  const handlers = new Set();
  const allRoutes = routeMap.get("*").get("*");
  const scopedRoutes = routeMap.get(scope).get(method);
  for (const item of new Set([...allRoutes, ...scopedRoutes])) {
    if (item.pattern.test(requestUrl)) {
      handlers.add(item.action);
    }
  }
  return {
    handlers,
    request,
  };
}
*/

/**
 * match(method, url)
 *
 * @param {string} method
 * @param {string} url
 */
export function match(method, url) {
  const methodNumber = methods.get(method.toUpperCase());
  const handlers = new Set();
  const params = new Map();
  /** @type {RouteItem} item */
  for (const item of map.values()) {
    if (methodNumber === item.method) {
      if (item.pattern.test({ pathname: url })) {
        params.set(
          item.pathname,
          item.pattern.exec({ pathname: url })?.pathname.groups,
        );
        handlers.add([...item.handlers]);
      }
    }
  }
  return {
    handlers,
    params,
  };
}

export function routesMiddleware() {
}
