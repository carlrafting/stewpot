# @stewpot/manage

Manage just about anything. Regardless if you manage photos, videos, markdown,
html, css or js `@stewpot/manage` can handle it!

## Getting Started

To get started, you need to create an app instance. Then create default export
of that instance.

```ts
// main.ts
import createApp from "@stewpot/manage";
const app = createApp();
export default app;
```

Now you can run the app with `deno serve main.ts`.

```bash
deno serve -RW main.ts
Map(2) { "sessions" => Kv {}, "kv" => Kv {} }
deno serve: Listening on http://0.0.0.0:8000/
```
