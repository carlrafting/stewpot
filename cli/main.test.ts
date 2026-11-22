import { assertEquals } from "@std/assert";
import { join } from "@std/path/join";
import { resolvePath } from "./main.ts";

const NAMES = ["STEWPOT_ROOT", "STEWPOT_DIR_OVERRIDE", "STEWPOT_MODE"];

/**
 * Runs `fn` with the stewpot environment variables set to `vars` (and the rest
 * unset), restores them afterwards, and returns what was passed to
 * `console.error`.
 */
function withEnv(
  vars: Record<string, string>,
  fn: () => void,
): string[] {
  const saved = NAMES.map((name) => [name, Deno.env.get(name)] as const);
  const warnings: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    warnings.push(args.join(" "));
  };

  try {
    for (const name of NAMES) Deno.env.delete(name);
    for (const [name, value] of Object.entries(vars)) {
      Deno.env.set(name, value);
    }
    fn();
  } finally {
    console.error = originalError;
    for (const [name, value] of saved) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
  return warnings;
}

Deno.test("resolvePath puts packages in a subdirectory of STEWPOT_ROOT", () => {
  const warnings = withEnv({ STEWPOT_ROOT: "/data/stewpot" }, () => {
    assertEquals(resolvePath("feeds"), join("/data/stewpot", "feeds"));
    assertEquals(resolvePath("manage"), join("/data/stewpot", "manage"));
  });

  assertEquals(warnings, []);
});

Deno.test("resolvePath prefers STEWPOT_ROOT over the deprecated override", () => {
  const warnings = withEnv(
    { STEWPOT_ROOT: "/data/stewpot", STEWPOT_DIR_OVERRIDE: "/old/place" },
    () => {
      assertEquals(resolvePath("feeds"), join("/data/stewpot", "feeds"));
    },
  );

  assertEquals(warnings, [], "no deprecation warning when ROOT is set");
});

Deno.test("resolvePath still honors STEWPOT_DIR_OVERRIDE and warns about it", () => {
  const warnings = withEnv({ STEWPOT_DIR_OVERRIDE: "/old/place" }, () => {
    assertEquals(resolvePath("feeds"), "/old/place", "used as is");
  });

  assertEquals(warnings.length, 1);
  assertEquals(
    warnings[0].includes("STEWPOT_DIR_OVERRIDE is deprecated"),
    true,
  );
  assertEquals(warnings[0].includes("STEWPOT_ROOT"), true);
});

Deno.test("resolvePath falls back to tmp in development", () => {
  withEnv({ STEWPOT_MODE: "development" }, () => {
    assertEquals(resolvePath("feeds"), join(Deno.cwd(), "tmp", "feeds"));
  });
});

Deno.test("resolvePath ignores an empty STEWPOT_ROOT", () => {
  withEnv({ STEWPOT_ROOT: "", STEWPOT_MODE: "development" }, () => {
    assertEquals(resolvePath("feeds"), join(Deno.cwd(), "tmp", "feeds"));
  });
});
