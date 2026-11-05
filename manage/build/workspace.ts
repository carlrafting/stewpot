import { isAbsolute, join, relative } from "@std/path";

const workspaceDirectoryLimit = 100;

export class BuildWorkspaceError extends Error {}

function isWithinRoot(root: string, path: string): boolean {
  const relativePath = relative(root, path);
  return relativePath === "" ||
    (!isAbsolute(relativePath) &&
      relativePath !== ".." &&
      !relativePath.startsWith("../") &&
      !relativePath.startsWith("..\\"));
}

function pathSegments(path: string): string[] {
  if (path.includes("\0")) {
    throw new BuildWorkspaceError("Directory paths cannot contain null bytes.");
  }
  if (isAbsolute(path)) {
    throw new BuildWorkspaceError("Choose a directory inside the workspace.");
  }
  const segments = path.split(/[\\/]+/).filter((segment) =>
    segment !== "" && segment !== "."
  );
  if (segments.includes("..")) {
    throw new BuildWorkspaceError(
      "Directory paths cannot leave the workspace.",
    );
  }
  return segments;
}

export async function resolveWorkspaceRoot(path: string): Promise<string> {
  if (!path.trim()) {
    throw new BuildWorkspaceError(
      "No build workspace is configured. Set builds.workspaceRoot when creating the Manage app.",
    );
  }
  const root = await Deno.realPath(path);
  const info = await Deno.stat(root);
  if (!info.isDirectory) {
    throw new BuildWorkspaceError(
      "The configured build workspace is not a directory.",
    );
  }
  return root;
}

export async function resolveWorkspaceDirectory(
  root: string,
  relativePath: string,
): Promise<{ path: string; relativePath: string }> {
  const segments = pathSegments(relativePath);
  let path = root;
  for (const segment of segments) {
    path = await Deno.realPath(join(path, segment));
    if (!isWithinRoot(root, path)) {
      throw new BuildWorkspaceError(
        "That directory resolves outside the configured build workspace.",
      );
    }
  }
  const info = await Deno.stat(path);
  if (!info.isDirectory) {
    throw new BuildWorkspaceError("The selected site path is not a directory.");
  }
  return { path, relativePath: relative(root, path) };
}

export async function resolveWorkspacePath(
  root: string,
  relativePath: string,
): Promise<{ path: string; exists: boolean }> {
  const segments = pathSegments(relativePath);
  let path = root;
  for (let index = 0; index < segments.length; index++) {
    const candidate = join(path, segments[index]);
    try {
      path = await Deno.realPath(candidate);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return {
          path: join(candidate, ...segments.slice(index + 1)),
          exists: false,
        };
      }
      throw error;
    }
    if (!isWithinRoot(root, path)) {
      throw new BuildWorkspaceError(
        "The output path resolves outside the configured build workspace.",
      );
    }
  }
  return { path, exists: true };
}

export async function listWorkspaceDirectories(
  root: string,
  relativePath: string,
): Promise<
  {
    currentPath: string;
    directories: { name: string; path: string }[];
    directoriesTruncated: boolean;
  }
> {
  const current = await resolveWorkspaceDirectory(root, relativePath);
  const directories: { name: string; path: string }[] = [];
  let directoriesTruncated = false;
  for await (const entry of Deno.readDir(current.path)) {
    if (!entry.isDirectory || entry.isSymlink) continue;
    if (directories.length === workspaceDirectoryLimit) {
      directoriesTruncated = true;
      break;
    }
    const path = await resolveWorkspaceDirectory(
      root,
      join(current.relativePath, entry.name),
    );
    directories.push({ name: entry.name, path: path.relativePath });
  }
  directories.sort((a, b) => a.name.localeCompare(b.name));
  return {
    currentPath: current.relativePath,
    directories,
    directoriesTruncated,
  };
}
