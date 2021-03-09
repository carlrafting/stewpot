// import { assertEquals, assertNotEquals } from "../../deps_test.js";
import test from 'ava';
import welcome from "./welcome.js";

test("welcome", t => {
  const result = welcome();
  t.is(typeof result, "string");
  t.is(typeof result, undefined);
});
