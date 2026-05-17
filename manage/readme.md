# @stewpot/manage

> ⚠️ **DISCLAIMER**: @stewpot/manage is under active development. Data safety
> can't be guaranteed. Use at your own risk. Don't store important data in this
> app.

Manage just about anything. Regardless if you manage photos, videos, markdown,
html, css or js `@stewpot/manage` can handle it!

## Getting Started

To get started, you need to create an app instance. Then create default export
of that instance.

```ts
// main.ts
import createApp from "@stewpot/manage";
const app = await createApp({ meta: import.meta });
export default app;
```

Now you can run the app with `deno serve main.ts`.

```bash
deno serve -RW main.ts
deno serve: Listening on http://0.0.0.0:8000/
```

It's also possible to use `createServer()` API for running the manage app.

```ts
import app, { createServer } from "@stewpot/manage";
const handler = await app({ meta: import.meta });
const options: Deno.ServeTcpOptions = {
  port: 3000,
};
await createServer(handler, options);
```

Then starting the server with `deno -RWN main.ts`.
