// import { getCookies } from "./deps.js";

export function cookies(_config = {}) {
  return function cookiesMiddleware(
    req: Request,
    next: (req: Request) => Response,
  ) {
    const res = next(req);
    // const cookies = getCookies(req.headers);
    // console.log(cookies);
    return res;
  };
}

export function logger(_config = {}) {
  return async function loggerMiddleware(
    req: Request,
    next: (req: Request) => Promise<Response>,
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

interface RequestContext {
  request: Request,
  url: URL,
  state: Record<string, unknown>,
  pathname: string,
  render: (template: string, options: Record<string, unknown>) => string
}

export function composeMiddleware({ state = {}, module = () => {} }) {
  return (
    request: Request,
    middlewares: (req: Request, next: (req: Request) => Response) => Response[],
    inner: Function,
  ) => {
    if (Array.isArray(middlewares)) {
      const executeMiddlewares = (req: Request) => {
        const mws = middlewares.reverse();
        const handlers: Array<Function> = [];

        function next() {
          const h = handlers.shift()!;
          return h();
        }

        if (mws) {
          for (const mw of mws) {
            handlers.push(() => mw(req, next));
          }
        }

        handlers.push(() => inner({ request: req, req, next, state, module }));
        const h = handlers.shift()!;
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
