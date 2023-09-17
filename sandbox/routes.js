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

const routeMap = new Map([
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

console.log("routeMap", routeMap);

function configureRoutes(scope = "/", fn) {
  let routes = null;
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

export function match(scope = "/", request = new Request("http://localhost")) {
  console.log({ request });
  const { method, url, headers } = request;
  const requestUrl = new URL(url);
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

function respond({
  handlers = new Set(),
  request = Request.prototype,
}) {
  console.log(request.url);
  // console.log("respond handlers", handlers);
  if (handlers.size > 0) {
    handlers = [...handlers]; // mutates handlers to array :/
    for (let i = handlers.length - 1; i > 0; i--) {
      const current = handlers[i];
      const next = handlers[i - 1];
      if (!next) {
        break;
      }
      console.log({ current, next });
      if (Array.isArray(current)) {
        const [controller, action] = current;
        // Object.prototype.call(controller, action)(request, next);
      }
    }
  }
  return new Response();
}

class BaseController {
  constructor() {}
  prepare() {
  }
  render() {
  }
  respond(action) {
    return new Response();
  }
}

class HomeController extends BaseController {
  index() {
    return "hello home!";
  }
  create() {
    return {
      id: 1,
      foo: "bar",
      date: new Date().toISOString(),
    };
  }
}

function foobar() {
  return "hello foobar!";
}

function all() {
  console.log("i love log!");
  return "hello all!";
}

configureRoutes("*", (routes) => {
  routes.all(all);
});

configureRoutes("/", (routes) => {
  routes.get("/", [HomeController, "index"]);
  routes.post("/", [HomeController, "create"]);
  routes.get("/foobar", foobar);
});

if (import.meta.main) {
  Deno.serve((req) => respond(match("/", req)));
}
