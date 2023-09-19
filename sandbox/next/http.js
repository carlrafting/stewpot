import { checkType } from "../../stewpot.js";
import { match } from "./routes.js";
import { app } from "./example.js";

const noop = () => {};
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

export const use = (fn) => middleware.set(middleware.size, fn);

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
  next(req);
  console.log("=> one");
});

use(function two(req, next) {
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

// insert(0, noop);

const process = (req, next) => {
  const result = next(req);
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
  return new Response(result);
};

function responseMiddleware(req, next) {
  try {
    return new Response(process(req, next));
  } catch (error) {
    console.error(error);
  }
}

// use(responseMiddleware);

export const flip = (bool = true) => !bool;

function executeMiddleware(req, inner) {
  const mws = Array.from(middleware.values()).reverse();
  const handlers = [];

  function next() {
    const h = handlers.shift();
    return h();
  }

  if (mws) {
    for (const mw of mws) {
      handlers.push(() => mw(req, next));
    }
  }

  handlers.push(() => inner(req, next));
  const h = handlers.shift();
  return h();
}

const wrap = (inner) => (req) => executeMiddleware(req, inner);

export function compose() {
}

console.log({
  middleware,
});

/**
 * serve()
 *
 * @param {(req: Request) => Response} fn
 * @returns {Deno.Server}
 */
export function serve(fn) {
  if (!fn) throw new Error("Expected handler to be given!");
  // handler = createHandler(handler);
  return Deno.serve({
    handler(req) {
      // return new Response("hello world");
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
