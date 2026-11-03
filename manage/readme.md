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
// main.ts
import app, { createServer } from "@stewpot/manage";
const handler = await app({ meta: import.meta });
const options: Deno.ServeTcpOptions = {
  port: 3000,
};
await createServer(handler, options);
```

Then starting the server with `deno -RWN main.ts`.

## Document block editor

Open **Documents** to create and edit documents. Documents support heading,
Markdown, text, media, file, and code blocks. Each block can be edited or
deleted. Use the block outline to navigate and drag blocks into a new order, or
use the move buttons. Drag-and-drop and live previews are added when JavaScript
is available; the forms and move buttons continue to work without JavaScript.
Markdown preview renders raw HTML as text rather than executing it.

## Data safety

The application does not currently create or verify backups automatically. Until
automated backup and recovery are available, stop the server before making a
backup or restoring data. Copy both KV database files together; by default these
are `database/sessions.db` and `database/kv.db` in the server's working
directory. If you configured custom paths, use those paths instead. Store
backups somewhere protected and verify that the application starts and the
expected documents are present after a restore.
