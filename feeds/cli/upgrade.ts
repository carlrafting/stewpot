import { compare, parse } from "@std/semver";

/** Compares two valid semantic versions. */
export function compareVersions(left: string, right: string): number {
  return compare(parse(left), parse(right));
}

/** Builds install arguments that allow the newest, newly-published JSR version. */
export function createUpgradeArgs(
  packageName: string,
  version: string,
): string[] {
  return [
    "install",
    "-RWNE",
    "-g",
    "-r",
    "-f",
    "--min-dep-age=0",
    "--allow-run",
    `jsr:${packageName}@${version}/cli`,
  ];
}
