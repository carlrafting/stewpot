import { assertEquals, assertStrictEquals } from "@std/assert";
import { compose, insert, type Middleware, remove, replace } from "./main.ts";

const mw = (): Middleware => (_request, next) => next();

Deno.test("insert adds middleware at the index in place", () => {
  const [a, b, c] = [mw(), mw(), mw()];
  const stack = [a, c];

  const removed = insert(stack, 1, b);

  assertEquals(stack.length, 3);
  assertStrictEquals(stack[0], a);
  assertStrictEquals(stack[1], b);
  assertStrictEquals(stack[2], c);
  assertEquals(removed, [], "insert removes nothing");
});

Deno.test("replace swaps the middleware at the index in place", () => {
  const [a, b, c] = [mw(), mw(), mw()];
  const stack = [a, b];

  const removed = replace(stack, 1, c);

  assertEquals(stack.length, 2);
  assertStrictEquals(stack[0], a);
  assertStrictEquals(stack[1], c);
  assertStrictEquals(removed[0], b, "returns the replaced middleware");
});

Deno.test("remove deletes the middleware at the index in place", () => {
  const [a, b] = [mw(), mw()];
  const stack = [a, b];

  const removed = remove(stack, 0, b);

  assertEquals(stack.length, 1);
  assertStrictEquals(stack[0], b);
  assertStrictEquals(removed[0], a, "returns the removed middleware");
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
