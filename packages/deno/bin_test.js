import { assertStrictEquals } from "https://deno.land/std@0.164.0/testing/asserts.ts";

Deno.test("foo", () => {
  assertStrictEquals(1, 2);
});
