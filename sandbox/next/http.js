import { checkType } from "../../stewpot.js";
import { match } from "./routes.js";

export const noop = () => {};

const middleware = new Map();

function callAction(current, request, next) {
  const output = new Set();
  if (Array.isArray(current)) {
    const [Controller, Action] = current;
    const instance = new Controller();
    output.add(instance[Action](request, next));
  }
  if (checkType(current) === "function") {
    output.add(current(request, next));
  }
  return output;
}

/**
 * use(...fns)
 *
 * register http middleware
 *
 * @param {Array<Function>} fns
 * @returns {undefined}
 */
export const use = (...fns) => {
  for (const fn of fns) {
    if (checkType(fn) !== "function") {
      throw new Error("middleware must be a function!");
    }
    middleware.set(middleware.size, fn);
  }
};

/* export const insert = (index, fn) => {
  const oldMiddleware = middleware.get(index);
  if (!oldMiddleware) return;
  for (const _middleware of middleware.entries()) {
    console.log(_middleware);
    const [id, fn] = _middleware;
    console.log({
      id,
      fn,
    });
    middleware.delete(id);
    const newId = id + 1;
    middleware.set(newId, fn);
    // continue;
  }
  const newMiddleware = middleware.set(index, fn);
  // middleware.set(index++, oldMiddleware);
}; */

use(function one(req, next) {
  console.log("=> one");
  const res = next(req);
  console.log("=> one");
  return res;
});

use(function two(req, next) {
  console.log("=> => two");
  const res = next(req);
  console.log("hello world!");
  console.log("=> => two");
  return res;
});

use(function three(req, next) {
  console.log("=> => => three");
  const res = next(req);
  console.log("=> => => three");
  return res;
});

// insert(0, noop);

/**
 * compose(...middleware)
 *
 * @param  {...Function} middleware
 */
export function compose(...middleware) {
}

/**
 * process(req, next)
 *
 * @param {Request} req
 * @param {Function} next
 * @returns {Response}
 */
function process(results) {
  const headers = new Headers();
  if (checkType(results) === "string") {
    headers.set("content-type", "text/plain");
  }
  if (
    checkType(results) === "object" ||
    checkType(results) === "array" ||
    checkType(results) === "set" ||
    checkType(results) === "map"
  ) {
    headers.set("content-type", "application/json");
    results = JSON.stringify(results);
  }
  if (results instanceof Response) {
    return results;
  }
  return new Response(results, { status: 200, headers });
}

function respond() {
}

function responseMiddleware(req, next) {
  try {
    const body = process(next());
    return new Response(body);
  } catch (error) {
    console.error(error);
  }
}

// use(responseMiddleware);

/**
 * @param {Request} req
 * @param {Function} inner
 * @returns {*}
 */
function executeMiddleware(req, inner) {
  const mws = Array.from(middleware.values());
  /** @type {Array<Function>} handlers */
  const handlers = [];

  function next() {
    const h = handlers.shift();
    if (!h) throw new Error("next: h is undefiend");
    return h();
  }

  if (mws) {
    for (const mw of mws) {
      handlers.push(() => mw(req, next));
    }
  }

  handlers.push(() => inner(req));
  const h = handlers.shift();
  if (!h) throw new Error("executeMiddleware: h is undefiend");
  return h();
}

/**
 * wrap(fn)
 *
 * @param {Function} fn
 * @returns {(req: Request) => any}
 */
const wrap = (fn) => (req) => {
  const results = executeMiddleware(req, fn);
  /* console.log({
    results,
  }); */
  if (!results) {
    throw new Error(
      "No response was returned in any of the middleware functions.",
    );
  }
  return process(results);
  return fn(req); // NOTE: hack for now
};

/* console.log({
  middleware,
}); */

/**
 * serve()
 *
 * @param {(req: Request) => Response} fn
 * @returns {Deno.Server}
 */
export function serve(fn) {
  if (!fn) throw new Error("Expected handler to be given!");
  return Deno.serve({
    handler(req) {
      return wrap(fn)(req);
    },
    onError(err) {
      console.error({ err });
      return new Response("This went a little bit pear-shaped, didn't it?", {
        status: 500,
      });
    },
  });
}
