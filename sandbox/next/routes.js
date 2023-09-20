// import routes from "./stewpot.js";

/**
 * scope
 * - "/" scope routes to root path
 * - "/app" scope routes to all paths beginning with /app
 * - "*" scope routes to all available paths
 */

const createRouteMapItem = () => {
  new Set();
};

const methods = new Map([
  ["GET", 1],
  ["POST", 2],
]);

const scopes = new Map([
  ["/", 1],
]);

const routes = new Map();

/* scopes.set("/", 1);

routes.set(0, {
  pathname: "/foo/:id",
  pattern: new URLPattern({ pathname: "/foo/:id" }),
  method: methods.get("GET"),
  handlers: [() => {}, () => {}],
  scope: scopes.get("/"),
});

console.log({
  methods,
  scopes,
  routes,
}); */

export const map = new Map([
  [
    "/",
    new Map([
      ["GET", new Set()],
      ["POST", new Set()],
    ]),
  ],
  [
    "*",
    new Map([
      ["*", new Set()],
      ["GET", new Set()],
      ["POST", new Set()],
    ]),
  ],
  // ["GET", createRouteMapItem()],
  // ["POST", createRouteMapItem()],
]);

function getRoutes(scope = "/") {
  // routeMap.get();
}

// console.log("routes map", map);

export function configureRoutes(scope = "/", fn) {
  let routes = null;
  const routeMap = map;
  routeMap.has(scope)
    ? (routes = routeMap.get(scope))
    : (routes = routeMap.set(scope));
  return fn(addRoute(routes));
}

const addRoute = (routes) => {
  const add = (method, path, action) => {
    routes
      .get(method.toUpperCase())
      .add({
        path,
        pattern: new URLPattern({ pathname: path }),
        action,
      });
  };
  return {
    get(path, action) {
      add("GET", path, action);
    },
    post(path, action) {
      add("POST", path, action);
    },
    all(action) {
      add("*", "*", action);
    },
  };
};

const url = new URL("http://localhost");

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
