import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std@0.201.0/testing/bdd.ts";
import { assertSnapshot } from "https://deno.land/std@0.201.0/testing/snapshot.ts";
import { assertEquals } from "https://deno.land/std@0.201.0/assert/assert_equals.ts";
import { checkType } from "./stewpot.js";

describe("checkType", () => {
  it("should handle several common objects", () => {
    assertEquals(checkType([]), "array");
    assertEquals(checkType({}), "object");
    assertEquals(checkType(null), "null");
    assertEquals(checkType(undefined), "undefined");
    assertEquals(checkType(new Map()), "map");
    assertEquals(checkType(new Set()), "set");
    // assertEquals(checkType(new Promise()), "promise");
    assertEquals(checkType(1), "number");
    assertEquals(checkType("hello world"), "string");
    assertEquals(checkType(true), "boolean");
  });
});
