import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import {
  BuildWorkspaceError,
  listWorkspaceDirectories,
  resolveWorkspaceDirectory,
  resolveWorkspacePath,
  resolveWorkspaceRoot,
} from "./workspace.ts";

Deno.test("workspace directory listing is limited to child directories", async () => {
  const root = await Deno.makeTempDir();
  try {
    await Deno.mkdir(join(root, "site"));
    await Deno.writeTextFile(join(root, "readme.txt"), "not a directory");

    const resolvedRoot = await resolveWorkspaceRoot(root);
    const listing = await listWorkspaceDirectories(resolvedRoot, "");

    assertEquals(listing.currentPath, "");
    assertEquals(listing.directories.map(({ name }) => name), ["site"]);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("workspace paths reject traversal and absolute paths", async () => {
  const root = await Deno.makeTempDir();
  try {
    const resolvedRoot = await resolveWorkspaceRoot(root);

    await assertRejects(
      () => resolveWorkspaceDirectory(resolvedRoot, "../outside"),
      BuildWorkspaceError,
    );
    await assertRejects(
      () => resolveWorkspacePath(resolvedRoot, "nested/../../outside"),
      BuildWorkspaceError,
    );
    await assertRejects(
      () => resolveWorkspacePath(resolvedRoot, join(root, "outside")),
      BuildWorkspaceError,
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("missing output paths are reported without creating them", async () => {
  const root = await Deno.makeTempDir();
  try {
    const resolvedRoot = await resolveWorkspaceRoot(root);
    const output = await resolveWorkspacePath(resolvedRoot, "_site");

    assertEquals(output.exists, false);
    await assertRejects(
      () => Deno.stat(join(root, "_site")),
      Deno.errors.NotFound,
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
