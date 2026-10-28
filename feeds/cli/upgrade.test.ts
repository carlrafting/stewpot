import { assertEquals, assertThrows } from "@std/assert";
import { compareVersions, createUpgradeArgs } from "./upgrade.ts";

Deno.test("compareVersions orders release versions", () => {
  assertEquals(compareVersions("0.15.3", "0.15.2"), 1);
  assertEquals(compareVersions("0.16.0", "0.15.9"), 1);
  assertEquals(compareVersions("0.15.2", "0.15.2"), 0);
  assertEquals(compareVersions("0.15.1", "0.15.2"), -1);
});

Deno.test("compareVersions orders prereleases before releases", () => {
  assertEquals(compareVersions("1.0.0-rc.2", "1.0.0-rc.10"), -1);
  assertEquals(compareVersions("1.0.0-rc.1", "1.0.0"), -1);
});

Deno.test("compareVersions rejects invalid versions", () => {
  assertThrows(() => compareVersions("latest", "0.15.2"), TypeError);
});

Deno.test("createUpgradeArgs allows fresh releases and pins the version", () => {
  const args = createUpgradeArgs("@stewpot/feeds", "0.15.2");
  assertEquals(args.includes("--min-dep-age=0"), true);
  assertEquals(args.at(-1), "jsr:@stewpot/feeds@0.15.2/cli");
});
