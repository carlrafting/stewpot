# 🧭 `simpleRoutes()` – Minimal Routing Middleware

`simpleRoutes()` is a lightweight, composable routing middleware based on _the
very minimal_ `@stewpot/middleware` & the standard library — no other external
dependencies. It leverages `URLPattern` for path matching and integrates
seamlessly with middleware stacks using `compose()`.

## ✨ Features

- 🧩 Composable with other middleware (e.g. logging, static)
- 📬 Route matching based on HTTP method and URL path
- 🪄 Named parameters via `URLPattern`
- ✅ Idiomatic fallback handling (404, 500)

## 🔧 Usage

### 1. Define your route handlers:

```ts
// routes.ts
import { defineRoutes } from "@stewpot/routes";

export default defineRoutes([
  {
    method: "GET",
    path: "/",
    handler: () => new Response("Hello from /"),
  },
  {
    method: "GET",
    path: "/hello/:name",
    handler: (req, params) => new Response(`Hello ${params.name}`),
  },
]);
```

### 2. Set up your server:

```ts
// main.ts
import { compose } from "@stewpot/middleware";
import simpleRoutes, { onNotFound } from "@stewpot/routes";
import routes from "./routes.ts";
import { logger } from "@stewpot/middleware/logger";

// Define middleware
const middleware = [
  logger,
  simpleRoutes(routes),
];

// Compose middleware and fallback
const handler = compose(
  middleware,
  (req: Request): Response => onNotFound(request),
);

// Run with deno serve
export default { fetch: handler };
```

You can then run your app with `deno serve` CLI command:

```sh
deno serve main.ts
```

## ✅ Route Parameters

`simpleRoutes()` uses `URLPattern` internally, so you can define named
parameters:

```ts
{
  method: "GET",
  path: "/user/:id",
  handler: (req, params) => new Response(`User ID: ${params.id}`),
}
```

## ⚠️ Error Handling

If a route throws an error, it’s caught and passed to the `onError()` handler.
You can define your own `onError()` handler or let your main app handler handle
errors if you prefer.

### Approach 1

```ts
// custom onError handler
import { onNotFound } from "@stewpot/routes";

function onError(req: Request, error: Error): Response {
  const response = new Response();
  // handle errors here...
  return response;
}

const middleware = [
    simpleRoutes(routes, { onError });
];

const handler = compose(middleware, (req: Request): Response => onNotFound(req))

export default { fetch: handler };
```

### Approach 2

```ts
import { onNotFound } from "@stewpot/routes";

function onError(req: Request, error: Error): Response {
  const response = new Response();
  // handle errors here...
  return response;
}

const middleware = [
    simpleRoutes(routes, { 
        onError(req: Request, error: Error) {
            return app(request, error);
        } 
    });
];

function app(req: Request, error?: Error): Response {
    if (error) {
        // handle errors
    }
    return onNotFound(req);
}

const handler = compose(middleware, app);

export default { fetch: handler };
```
