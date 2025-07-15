import { type Middleware, type RequestHandler, compose } from "../main.ts";
import logger from "../logger.ts";

const middleware: Middleware[] = [logger];

const finalHandler: RequestHandler = () => new Response("Hello World!");
const composedHandler: RequestHandler = compose(middleware, finalHandler);

if (import.meta.main) {
    const port = 8000;
    Deno.serve({ port }, composedHandler);
    console.log(`Server started at localhost:${port}`);
}

export default composedHandler;
