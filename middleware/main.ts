/**
 * This modules defines types used for middleware. It exports `compose()` and some helpers like: `insert()` & `replace()` for manipulating a stack of middleware.
 * 
 * @example
 * ```ts

import { compose, Middleware } from "jsr:@stewpot/middleware";

const logger: Middleware = async (request, next) => {
    console.log(`${request.method} ${request.url}`);
    return await next();
};

const handler = compose([logger], () => {
  return new Response("Hello from final handler!");
});

Deno.serve(handler);
```
 *
 * 
 * @module
 */
export type NextHandler = () => Promise<Response> | Response
export type Middleware = (request: Request, next: NextHandler) => Promise<Response> | Response;
export type RequestHandler = (request: Request, info?: Deno.ServeHandlerInfo | null) => Promise<Response> | Response;
export type Helper = (middleware: Middleware[], index: number, fn: Middleware) => Middleware[];

export function compose(middlewares: Middleware[], handler: RequestHandler): RequestHandler;
export function compose(middlewares: Middleware[], handler: RequestHandler, info?: Deno.ServeHandlerInfo): RequestHandler {
    return middlewares.reduceRight<RequestHandler>(
        (next, mw) => async (request: Request) => await mw(request, () => next(request, info)),
        handler
    );
}

export const insert: Helper = (middleware: Middleware[], index: number, fn: Middleware) => middleware.splice(index, 0, fn);
export const replace: Helper = (middleware: Middleware[], index: number, fn: Middleware) => middleware.splice(index, 1, fn);
export const remove: Helper = (middleware: Middleware[], index: number) => middleware.splice(index, 1);
