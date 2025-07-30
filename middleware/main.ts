export type NextHandler = () => Promise<Response> | Response
export type Middleware = (request: Request, next: NextHandler) => Promise<Response> | Response;
export type RequestHandler = (request: Request) => Promise<Response> | Response;
export type Helper = (middleware: Middleware[], index: number, fn: Middleware) => Middleware[];

export function compose(middlewares: Middleware[], handler: RequestHandler): RequestHandler {
    return middlewares.reduceRight<RequestHandler>(
        (next, mw) => async (request: Request) => await mw(request, () => next(request)),
        handler
    );
}

export const insert: Helper = (middleware: Middleware[], index: number, fn: Middleware) => middleware.splice(index, 0, fn);
export const replace: Helper = (middleware: Middleware[], index: number, fn: Middleware) => middleware.splice(index, 1, fn);
export const remove: Helper = (middleware: Middleware[], index: number) => middleware.splice(index, 1);
