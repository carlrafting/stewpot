import { assertEquals, assertStrictEquals } from "@std/assert";
import { compose, insert, type Middleware, remove, replace } from "./main.ts";

const mw = (): Middleware => (_request, next) => next();

Deno.test("insert adds middleware at the index and returns the stack", () => {
  const [a, b, c] = [mw(), mw(), mw()];
  const stack = [a, c];

  const result = insert(stack, 1, b);

  assertStrictEquals(result, stack, "returns the array it was given");
  assertEquals(stack.length, 3);
  assertStrictEquals(stack[0], a);
  assertStrictEquals(stack[1], b);
  assertStrictEquals(stack[2], c);
});

Deno.test("replace swaps the middleware at the index and returns the stack", () => {
  const [a, b, c] = [mw(), mw(), mw()];
  const stack = [a, b];

  const result = replace(stack, 1, c);

  assertStrictEquals(result, stack, "returns the array it was given");
  assertEquals(stack.length, 2);
  assertStrictEquals(stack[0], a);
  assertStrictEquals(stack[1], c);
});

Deno.test("remove deletes the middleware at the index and returns the stack", () => {
  const [a, b] = [mw(), mw()];
  const stack = [a, b];

  const result = remove(stack, 0);

  assertStrictEquals(result, stack, "returns the array it was given");
  assertEquals(stack.length, 1);
  assertStrictEquals(stack[0], b);
});

Deno.test("stack helpers can be chained", () => {
  const [a, b, c, d] = [mw(), mw(), mw(), mw()];

  const stack = remove(replace(insert([a, b], 1, c), 0, d), 2);

  assertEquals(stack, [d, c]);
});

Deno.test("compose calls the final handler when there is no middleware", async () => {
  const handler = compose([], () => new Response("final"));

  const response = await handler(new Request("http://localhost"));

  assertEquals(await response.text(), "final");
});

Deno.test("compose lets middleware short-circuit the chain", async () => {
  let handlerCalled = false;
  const blocker: Middleware = () => new Response("blocked", { status: 403 });
  const handler = compose([blocker], () => {
    handlerCalled = true;
    return new Response("final");
  });

  const response = await handler(new Request("http://localhost"));

  assertEquals(response.status, 403);
  assertEquals(handlerCalled, false);
});

Deno.test("compose lets middleware modify the response", async () => {
  const addHeader: Middleware = async (_request, next) => {
    const response = await next();
    response.headers.set("x-test", "yes");
    return response;
  };
  const handler = compose([addHeader], () => new Response("final"));

  const response = await handler(new Request("http://localhost"));

  assertEquals(response.headers.get("x-test"), "yes");
});

Deno.test("compose forwards the connection info to the final handler", async () => {
  const info = {
    remoteAddr: { transport: "tcp", hostname: "127.0.0.1", port: 1234 },
    completed: Promise.resolve(),
  } as Deno.ServeHandlerInfo;
  let received: Deno.ServeHandlerInfo | null | undefined;
  const handler = compose([mw(), mw()], (_request, handlerInfo) => {
    received = handlerInfo;
    return new Response("final");
  });

  await handler(new Request("http://localhost"), info);

  assertStrictEquals(received, info);
});
