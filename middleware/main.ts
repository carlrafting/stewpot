import { logger } from "./logger.ts";

export type ResponseType = Promise<Response> | Response;
export type NextHandler = () => Promise<Response> | Response
export type Middleware = (request: Request, next: NextHandler) => ResponseType;
export type RequestHandler = (request: Request) => ResponseType;

const middleware: Middleware[] = [];

export function compose(middlewares: Middleware[], handler: RequestHandler): RequestHandler {
    return middlewares.reduceRight<RequestHandler>(
        (next, mw) => async (request: Request) => await mw(request, () => next(request)),
        handler
    );
}

const finalHandler: RequestHandler = () => new Response("Hello World!");
const composedHandler: RequestHandler = compose([logger], finalHandler);

if (import.meta.main) {
    const port = 8000;
    Deno.serve({ port }, composedHandler);
    console.log(`Server started at localhost:${port}`);
}

export default composedHandler;
