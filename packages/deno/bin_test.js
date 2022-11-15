import { assertStrictEquals } from "https://deno.land/std@0.163.0/testing/asserts.ts";

Deno.test("foo", () => {
    assertStrictEquals(1, 2);
});
