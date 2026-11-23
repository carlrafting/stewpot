# @stewpot/middleware

A lightweight and composable middleware framework for building HTTP server logic
in [Deno](https://deno.com/). Designed to work seamlessly with `Deno.serve` and
the `deno serve` CLI.

- 📦 No external dependencies
- 🧱 Middleware composition
- ✅ Type-safe with `Request` and `Response`
- 🛠️ Compatible with JSR module ecosystem

## Install

```sh
deno add jsr:@stewpot/middleware
```

## Quick Start

```ts
// main.ts
import { compose, type Middleware } from "jsr:@stewpot/middleware";

const logger: Middleware = async (request, next) => {
  console.log(`${request.method} ${request.url}`);
  return await next();
};

const handler = compose([logger], () => {
  return new Response("Hello from final handler!");
});

Deno.serve(handler);
```

Or run with the `deno serve` CLI, from a file that exports the composed handler
as its default export:

```ts ignore
// serve.ts
import handler from "./main.ts";

export default {
  fetch: handler,
};
```

## Middleware Signature

```ts
type NextHandler = () => Promise<Response> | Response;

type Middleware = (
  request: Request,
  next: NextHandler,
) => Promise<Response> | Response;
```

Each middleware receives the current `Request` and a `next()` function.
Middleware can:

- Mutate or inspect the request
- Short-circuit the chain (e.g., auth, caching)
- Defer to the next handler

## Compose

```ts ignore
function compose(
  middlewares: Middleware[],
  finalHandler: RequestHandler,
): RequestHandler;
```

Combines an array of middleware functions with a final request handler.
Middleware run in array order: the first entry sees the request first and the
response last. A middleware that returns without calling `next()` short-circuits
the chain.

## Stack helpers

`insert()`, `replace()` and `remove()` change a middleware array in place and
return that same array, so calls can be chained:

```ts
import {
  compose,
  insert,
  type Middleware,
  remove,
  replace,
} from "jsr:@stewpot/middleware";

const pass: Middleware = (_request, next) => next();
const stack: Middleware[] = [pass, pass, pass];

insert(stack, 1, pass); // add an entry at index 1
replace(stack, 0, pass); // swap the entry at index 0
remove(stack, 2); // drop the entry at index 2

const handler = compose(
  remove(replace(stack, 0, pass), 1),
  () => new Response("Hello!"),
);
```

## Included middleware

All of these are exported from the package root and from their own entry point.

### Logger

Logs each request and the status of its response.

```ts
import { logger } from "jsr:@stewpot/middleware/logger";
```

### Static files

Serves files from a directory and falls through to the next middleware when no
file matches. `path` defaults to `./public`; set `debug` to log file-server
activity.

```ts
import serveStatic from "jsr:@stewpot/middleware/static";

const middleware = serveStatic({ path: "./public", debug: true });
```

### Dev reload

Reloads the browser when watched files change, by injecting a small script into
HTML responses that connects back to `/reload` over a WebSocket. For development
only.

```ts
import devReload from "jsr:@stewpot/middleware/dev";

const middleware = devReload({ watchPaths: ["./templates", "./public"] });

// Stop watching files, for example when shutting down or in tests.
middleware.close();
```

Every watched path must exist, or `devReload()` throws.

### AI crawler block

Responds with `403 Forbidden` to user agents on the
[ai.robots.txt](https://github.com/ai-robots-txt/ai.robots.txt) blocklist. The
list is fetched once, when the middleware is created, so creating it is async
and needs network access. It throws if the list cannot be fetched.

```ts
import aiblock from "jsr:@stewpot/middleware/aiblock";

const middleware = await aiblock();
```

Pass your own list of user agent substrings to skip the download, for example in
tests or offline:

```ts
import aiblock from "jsr:@stewpot/middleware/aiblock";

const middleware = await aiblock({ blocklist: ["GPTBot", "CCBot"] });
```

## Type Exports

- `Middleware` – Standard middleware function type
- `NextHandler` – Callback passed to middleware
- `RequestHandler` – Final request handler (`(req) => Response`)
- `Helper` – Signature shared by `insert()`, `replace()` and `remove()`

## Related Packages

- [`@stewpot/routes`](https://jsr.io/@stewpot/routes): A tiny route matcher
  middleware using `URLPattern`.
