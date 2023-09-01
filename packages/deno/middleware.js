// import { getCookies } from "./deps.js";

export function cookies(_config = {}) {
  return function cookiesMiddleware(
    req,
    next,
  ) {
    const res = next(req);
    // const cookies = getCookies(req.headers);
    // console.log(cookies);
    return res;
  };
}

export function logger(_config = {}) {
  return async function loggerMiddleware(
    req,
    next,
  ) {
    const res = await next(req);
    const url = new URL(req.url);
    console.log(req.method, url.pathname, res.status);
    return res;
  };
}

export const middlewares = [
  cookies(),
  logger(),
];

export function composeMiddleware({ state = {}, module = () => {} }) {
  return (
    request,
    middlewares,
    inner,
  ) => {
    if (Array.isArray(middlewares)) {
      const executeMiddlewares = (req) => {
        const mws = middlewares.reverse();
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

        handlers.push(() => inner({ request, req, next, state, module }));
        const h = handlers.shift();
        return h();
      };

      return executeMiddlewares(request);
    }

    return inner({
      request,
      state,
      module,
    });
  };
}
