export type ResponseType = Promise<Response> | Response;
export type NextHandler = () => Promise<Response> | Response
export type Middleware = (request: Request, next: NextHandler) => ResponseType;
export type RequestHandler = (request: Request) => ResponseType;

export function compose(middlewares: Middleware[], handler: RequestHandler): RequestHandler {
    return middlewares.reduceRight<RequestHandler>(
        (next, mw) => async (request: Request) => await mw(request, () => next(request)),
        handler
    );
}
