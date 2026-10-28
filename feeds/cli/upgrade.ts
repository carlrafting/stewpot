/** Compares two valid semantic versions. */
export function compareVersions(left: string, right: string): number {
  const leftVersion = parseVersion(left);
  const rightVersion = parseVersion(right);

  for (let index = 0; index < 3; index++) {
    const leftPart = leftVersion.core[index];
    const rightPart = rightVersion.core[index];
    if (leftPart !== rightPart) return leftPart < rightPart ? -1 : 1;
  }

  if (!leftVersion.prerelease.length || !rightVersion.prerelease.length) {
    return leftVersion.prerelease.length === rightVersion.prerelease.length
      ? 0
      : leftVersion.prerelease.length
      ? -1
      : 1;
  }

  const length = Math.max(
    leftVersion.prerelease.length,
    rightVersion.prerelease.length,
  );
  for (let index = 0; index < length; index++) {
    const leftPart = leftVersion.prerelease[index];
    const rightPart = rightVersion.prerelease[index];
    if (leftPart === undefined || rightPart === undefined) {
      return leftPart === undefined ? -1 : 1;
    }
    if (leftPart === rightPart) continue;

    const leftNumeric = /^\d+$/.test(leftPart);
    const rightNumeric = /^\d+$/.test(rightPart);
    if (leftNumeric && rightNumeric) {
      const difference = BigInt(leftPart) - BigInt(rightPart);
      return difference < 0n ? -1 : 1;
    }
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return leftPart < rightPart ? -1 : 1;
  }
  return 0;
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

function parseVersion(version: string): {
  core: [bigint, bigint, bigint];
  prerelease: string[];
} {
  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/
      .exec(version);
  if (!match) throw new TypeError(`Invalid semantic version: ${version}`);

  return {
    core: [
      BigInt(match[1]),
      BigInt(match[2]),
      BigInt(match[3]),
    ],
    prerelease: match[4]?.split(".") ?? [],
  };
}
