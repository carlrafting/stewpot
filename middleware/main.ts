import aiblockMiddleware from "./aiblock.ts";
import devReloadMiddleware from "./dev.ts";
import loggerMiddleware from "./logger.ts";
import serveStaticMiddleware from "./static.ts";

/**
 * This module defines the types used for middleware. It exports `compose()` and
 * some helpers like `insert()`, `replace()` and `remove()` for manipulating a
 * stack of middleware.
 *
 * @example
 * ```ts
 * import { compose, type Middleware } from "jsr:@stewpot/middleware";
 *
 * const logger: Middleware = async (request, next) => {
 *   console.log(`${request.method} ${request.url}`);
 *   return await next();
 * };
 *
 * const handler = compose([logger], () => {
 *   return new Response("Hello from final handler!");
 * });
 *
 * Deno.serve(handler);
 * ```
 *
 * @module
 */
/** Calls the next middleware in the chain, or the final handler if there is none. */
export type NextHandler = () => Promise<Response> | Response;

/**
 * A function that receives the incoming request and a `next()` function. It can
 * inspect the request, short-circuit by returning its own response, or call
 * `next()` and modify the response that comes back.
 */
export type Middleware = (
  request: Request,
  next: NextHandler,
) => Promise<Response> | Response;

/** The final handler of a middleware chain, compatible with `Deno.serve`. */
export type RequestHandler = (
  request: Request,
  info?: Deno.ServeHandlerInfo | null,
) => Promise<Response> | Response;

/**
 * Signature shared by {@linkcode insert} and {@linkcode replace}.
 * {@linkcode remove} takes only the first two arguments.
 */
export type Helper = (
  middleware: Middleware[],
  index: number,
  fn: Middleware,
) => Middleware[];

/**
 * Combines middleware with a final handler into a single request handler.
 * Middleware run in array order: the first entry sees the request first and the
 * response last.
 *
 * @param middlewares Middleware to run, outermost first
 * @param handler Final handler, called when every middleware calls `next()`
 * @returns A request handler that can be passed to `Deno.serve`. The connection
 * info that `Deno.serve` passes along is forwarded to the final handler.
 */
export function compose(
  middlewares: Middleware[],
  handler: RequestHandler,
): RequestHandler {
  return middlewares.reduceRight<RequestHandler>(
    (next, mw) => async (request: Request, info) =>
      await mw(request, () => next(request, info)),
    handler,
  );
}

/**
 * Inserts `fn` at `index`, in place.
 *
 * @returns The same array that was passed in, for chaining
 */
export const insert: Helper = (
  middleware: Middleware[],
  index: number,
  fn: Middleware,
): Middleware[] => {
  middleware.splice(index, 0, fn);
  return middleware;
};

/**
 * Replaces the middleware at `index` with `fn`, in place.
 *
 * @returns The same array that was passed in, for chaining
 */
export const replace: Helper = (
  middleware: Middleware[],
  index: number,
  fn: Middleware,
): Middleware[] => {
  middleware.splice(index, 1, fn);
  return middleware;
};

/**
 * Removes the middleware at `index`, in place.
 *
 * @returns The same array that was passed in, for chaining
 */
export const remove = (
  middleware: Middleware[],
  index: number,
): Middleware[] => {
  middleware.splice(index, 1);
  return middleware;
};

export {
  aiblockMiddleware,
  devReloadMiddleware,
  loggerMiddleware,
  serveStaticMiddleware,
};
