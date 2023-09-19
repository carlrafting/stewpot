import { checkType } from "../../stewpot.js";
import { match } from "./routes.js";
import { app } from "./example.js";

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

export function use(fn) {
  return middleware.set(middleware.size, fn);
}

const noop = () => {};

const middleware = new Map();

use(function one(req, next) {
  console.log({
    next,
  });
  console.log("=> one");
  next(req);
  console.log("=> one");
});
use(function two(req, next) {
  console.log({
    next,
  });
  console.log("=> => two");
  next(req);
  console.log("hello world!");
  console.log("=> => two");
});
use(function three(req, next) {
  console.log("=> => => three");
  next(req);
  console.log("=> => => three");
});

console.log({
  middleware,
});

function handleRequest(req, fn) {
  const headers = new Headers();
  const middlewares = compose(middleware, all);
  const handle = async (req, fn) => await fn(req);
  const result = handle(middlewares(req, app));
  // await result;
  console.log({ result });
  if (checkType(result) === "string") {
    headers.set("content-type", "text/plain");
    return result;
  }
  if (
    checkType(result) === "object" ||
    checkType(result) === "array" ||
    checkType(result) === "set" ||
    checkType(result) === "map"
  ) {
    headers.set("content-type", "application/json");
    return JSON.stringify(result);
  }
  if (fn && checkType(fn) === "function") {
    return fn(result);
  }
  if (checkType(fn) !== "function") {
    throw new Error("Expected fn to be a function");
  }
  throw new Error("Everything went wrong!");
}

export const flip = (bool = true) => !bool;

function dispatchMiddleware(req, inner) {
  let count = -1;
  return function outer() {
    if (count === -1) count++;
    console.log({
      count,
    });
    const fn = middleware.get(count);
    count++;
    const next = middleware.get(count) || inner;
    /* if (!next && fn) {
      return fn(req, last(req));
    } */
    /* if (!next && !fn) {
      // return (req) => inner();
      throw new Error("Something went horribly wrong, we don't want this!");
    } */
    console.log({ fn, next });
    if (count === middleware.size) {
      // const result = next(req, inner());
      count = 0;
      return next(req, () => {});
      // return result;
    } //
    return fn(req, outer());
    // return inner();
  };
}

export function respond(req) {
  const fn = dispatchMiddleware(req, app);
  function last(req) {
    return new Response("hello there");
  }
  return fn();
}

/**
 * koa-compose
 * https://github.com/koajs/compose/
 *
 * @param  {Array<Function>} middleware
 * @returns {(request: Request, next: () => any) => any}
 */
export function compose(...middleware) {
  for (const fn of middleware) {
    if (typeof fn !== "function") {
      throw new TypeError("middleware must be composed of functions!");
    }
  }

  /**
   * fn(request, next)
   *
   * @param {Request} request
   * @param {Function} next
   */
  const fn = (request, next) => {
    /** @var {Number} */
    let index = -1;

    /**
     * dispatch(i)
     *
     * @param {Number} i
     */
    async function dispatch(i = 0) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      /** @var {Function} */
      let fn = middleware[i];
      if (i === middleware.length) {
        fn = next;
      }
      if (!fn) throw new Error("fn is undefined");
      try {
        return await fn(request, dispatch(i + 1));
      } catch (error) {
        throw error;
      }
    }
    return dispatch();
  };

  return fn;
}

function _handler(req) {
  return respond(req);
}

/**
 * serve()
 *
 * @param {(req: Request) => Response} handler
 * @returns {Deno.Server}
 */
export function serve(handler = _handler) {
  return Deno.serve({
    handler,
    onError(err) {
      console.error({ err });
      return new Response("This went a little bit pear-shaped, didn't it?", {
        status: 500,
      });
    },
  });
}
