# @stewpot/middleware

A lightweight and composable middleware framework for building HTTP server logic
in [Deno](https://deno.com/). Designed to work seamlessly with `Deno.serve` and
the `deno serve` CLI.

- 📦 No external dependencies
- 🧱 Middleware composition
- ✅ Type-safe with `Request` and `Response`
- 🛠️ Compatible with JSR module ecosystem

## 📦 Install

```sh
deno add jsr:@stewpot/middleware
```

## 🚀 Quick Start

```ts
// main.ts
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

Or run with the `deno serve` CLI:

```ts
// serve.ts
import handler from "./main.ts";

export default {
  fetch: handler,
};
```

## 🧱 Middleware Signature

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

## 🪄 Compose

```ts
function compose(
  middlewares: Middleware[],
  finalHandler: RequestHandler,
): RequestHandler;
```

Combines an array of middleware functions with a final request handler.

## ✅ Type Exports

- `Middleware` – Standard middleware function type
- `NextHandler` – Callback passed to middleware
- `RequestHandler` – Final request handler (`(req) => Response`)

## 🔗 Related Packages

- [`@stewpot/routes`](https://jsr.io/@stewpot/routes): A tiny route matcher
  middleware using `URLPattern`.
