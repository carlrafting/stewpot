import { type Middleware, type RequestHandler, compose } from "../main.ts";
import logger from "../logger.ts";
import serveStatic from "../static.ts";
import devReloadMiddleware from "../dev.ts";

const middleware: Middleware[] = [
    logger,
    devReloadMiddleware({ watchPaths: [import.meta.resolve("./public")] }),
    serveStatic()
];
const headers = new Headers({ "content-type": "text/html; charset=utf8" })
const finalHandler: RequestHandler = () => new Response("Hello World!", { headers });
const composedHandler: RequestHandler = compose(middleware, finalHandler);

if (import.meta.main) {
    const port = 8000;
    Deno.serve({ port }, composedHandler);
    console.log(`Server started at localhost:${port}`);
}

export default composedHandler;
