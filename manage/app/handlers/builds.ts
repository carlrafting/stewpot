import { basename } from "@std/path";
import { html } from "../../http/response.ts";
import type { Route, RouteContext } from "../../http/routes.ts";
import { buildAdapters, findBuildAdapter } from "../../build/adapters.ts";
import type { BuildInspection } from "../../build/adapter.ts";
import {
  BuildWorkspaceError,
  listWorkspaceDirectories,
  resolveWorkspaceDirectory,
  resolveWorkspacePath,
  resolveWorkspaceRoot,
} from "../../build/workspace.ts";
import type { BuildSite } from "../data.ts";
import nav from "../nav.ts";

function getKv(context: RouteContext): Deno.Kv {
  const kv = context.connections.get("kv");
  if (!kv) throw new Error("The main key-value connection is unavailable.");
  return kv;
}

function getBuildErrorMessage(error: unknown, workspaceRoot?: string): string {
  if (error instanceof BuildWorkspaceError) return error.message;
  if (error instanceof Deno.errors.NotCapable) {
    return `Manage cannot read the configured build workspace. Grant Deno read permission for "${
      workspaceRoot ?? "the configured workspace"
    }" (for example, --allow-read="${workspaceRoot ?? "PATH"}").`;
  }
  if (error instanceof Deno.errors.NotFound) {
    return "The configured workspace or selected directory could not be found.";
  }
  throw error;
}

async function getSites(kv: Deno.Kv): Promise<BuildSite[]> {
  const sites: BuildSite[] = [];
  for await (const entry of kv.list<BuildSite>({ prefix: ["buildSites"] })) {
    sites.push(entry.value);
  }
  return sites.sort((a, b) => a.name.localeCompare(b.name));
}

async function renderIndex(
  context: RouteContext,
  error?: string,
  status = 200,
): Promise<Response> {
  const title = "Builds";
  const description = "Configure and inspect static-site builds.";
  const kv = getKv(context);
  const sites = await getSites(kv);
  const workspaceRoot = context.buildWorkspaceRoot;
  const adapters = buildAdapters.map(({ id, name }) => ({ id, name }));
  let currentPath = "";
  let currentName = "Site";
  let directories: { name: string; path: string; href: string }[] = [];
  let directoriesTruncated = false;
  let parentHref: string | undefined;

  if (workspaceRoot) {
    try {
      const root = await resolveWorkspaceRoot(workspaceRoot);
      const listing = await listWorkspaceDirectories(
        root,
        context.url.searchParams.get("path") ?? "",
      );
      currentPath = listing.currentPath;
      currentName = basename(currentPath || root);
      directoriesTruncated = listing.directoriesTruncated;
      directories = listing.directories.map((directory) => ({
        ...directory,
        href: `/builds/?path=${encodeURIComponent(directory.path)}`,
      }));
      if (currentPath) {
        const parts = currentPath.split(/[\\/]/);
        parts.pop();
        const parentPath = parts.join("/");
        parentHref = parentPath
          ? `/builds/?path=${encodeURIComponent(parentPath)}`
          : "/builds/";
      }
    } catch (caught) {
      error = getBuildErrorMessage(caught, workspaceRoot);
      status = caught instanceof BuildWorkspaceError ||
          caught instanceof Deno.errors.NotFound
        ? 400
        : 500;
    }
  }

  const page = await context.render("builds/index.vto");
  const body = await page({
    title,
    description,
    url: context.url,
    nav,
    workspaceRoot,
    currentPath,
    currentName,
    directories,
    directoriesTruncated,
    parentHref,
    sites,
    adapters,
    error,
  });
  return html(body, { headers: context.headers, status });
}

async function findSite(
  context: RouteContext,
  id: string | undefined,
): Promise<BuildSite | undefined> {
  if (!id) return undefined;
  const entry = await getKv(context).get<BuildSite>(["buildSites", id]);
  return entry.value ?? undefined;
}

async function renderSite(
  context: RouteContext,
  site: BuildSite,
  error?: string,
  status = 200,
): Promise<Response> {
  let inspection: BuildInspection | undefined;
  const selectedAdapter = findBuildAdapter(site.adapter);
  try {
    if (!selectedAdapter) {
      throw new BuildWorkspaceError(
        `The "${site.adapter}" build adapter is not available.`,
      );
    }
    if (!context.buildWorkspaceRoot) {
      throw new BuildWorkspaceError(
        "No build workspace is configured. Set builds.workspaceRoot when creating the Manage app.",
      );
    }
    const root = await resolveWorkspaceRoot(context.buildWorkspaceRoot);
    const selected = await resolveWorkspaceDirectory(root, site.path);
    inspection = await selectedAdapter.inspect(
      selected.path,
      site.outputDirectory,
    );
  } catch (caught) {
    error = getBuildErrorMessage(caught, context.buildWorkspaceRoot);
    status = caught instanceof BuildWorkspaceError ||
        caught instanceof Deno.errors.NotFound
      ? 400
      : 500;
  }

  const page = await context.render("builds/site.vto");
  const body = await page({
    title: site.name,
    description:
      "Read-only inspection; Manage does not run or publish this site.",
    url: context.url,
    nav,
    site,
    adapters: buildAdapters.map(({ id, name }) => ({ id, name })),
    selectedAdapter,
    inspection,
    error,
  });
  return html(body, { headers: context.headers, status });
}

function formString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export default [
  {
    name: "builds_index",
    method: "GET",
    pathname: "/builds/",
    async handler(context) {
      return await renderIndex(context);
    },
  },
  {
    name: "builds_create",
    method: "POST",
    pathname: "/builds/create/",
    async handler(context) {
      const form = await context.request.formData();
      const relativePath = formString(form, "path");
      const outputDirectory = formString(form, "outputDirectory") || "_site";
      const selectedAdapter = findBuildAdapter(formString(form, "adapter"));
      if (!selectedAdapter) {
        return await renderIndex(
          context,
          "Select a supported build adapter.",
          400,
        );
      }
      if (!context.buildWorkspaceRoot) {
        return await renderIndex(
          context,
          "No build workspace is configured. Set builds.workspaceRoot when creating the Manage app.",
          400,
        );
      }

      try {
        const root = await resolveWorkspaceRoot(context.buildWorkspaceRoot);
        const selected = await resolveWorkspaceDirectory(root, relativePath);
        await resolveWorkspacePath(selected.path, outputDirectory);
        const id = crypto.randomUUID();
        const site: BuildSite = {
          id,
          name: formString(form, "name") ||
            basename(selected.relativePath || root),
          path: selected.relativePath,
          adapter: selectedAdapter.id,
          outputDirectory,
          created: Temporal.Now.plainDateTimeISO().toString(),
          updated: Temporal.Now.plainDateTimeISO().toString(),
        };
        await getKv(context).set(["buildSites", id], site);
        return Response.redirect(new URL(`/build/${id}/`, context.url));
      } catch (caught) {
        const error = getBuildErrorMessage(caught, context.buildWorkspaceRoot);
        const status = caught instanceof BuildWorkspaceError ||
            caught instanceof Deno.errors.NotFound
          ? 400
          : 500;
        return await renderIndex(context, error, status);
      }
    },
  },
  {
    name: "build_site",
    method: "GET",
    pattern: new URLPattern({ pathname: "/build/:id/" }),
    async handler(context) {
      const site = await findSite(context, context.params.id);
      if (!site) return html("Build site not found.", { status: 404 });
      return await renderSite(context, site);
    },
  },
  {
    name: "build_site_update",
    method: "POST",
    pattern: new URLPattern({ pathname: "/build/:id/update/" }),
    async handler(context) {
      const site = await findSite(context, context.params.id);
      if (!site) return html("Build site not found.", { status: 404 });
      const form = await context.request.formData();
      const outputDirectory = formString(form, "outputDirectory") || "_site";
      const selectedAdapter = findBuildAdapter(formString(form, "adapter"));
      if (!selectedAdapter) {
        return await renderSite(
          context,
          site,
          "Select a supported build adapter.",
          400,
        );
      }
      try {
        if (!context.buildWorkspaceRoot) {
          throw new BuildWorkspaceError(
            "No build workspace is configured. Set builds.workspaceRoot when creating the Manage app.",
          );
        }
        const root = await resolveWorkspaceRoot(context.buildWorkspaceRoot);
        const selected = await resolveWorkspaceDirectory(root, site.path);
        await resolveWorkspacePath(selected.path, outputDirectory);
        const updated: BuildSite = {
          ...site,
          adapter: selectedAdapter.id,
          outputDirectory,
          updated: Temporal.Now.plainDateTimeISO().toString(),
        };
        await getKv(context).set(["buildSites", site.id], updated);
        return Response.redirect(new URL(`/build/${site.id}/`, context.url));
      } catch (caught) {
        const error = getBuildErrorMessage(caught, context.buildWorkspaceRoot);
        const status = caught instanceof BuildWorkspaceError ||
            caught instanceof Deno.errors.NotFound
          ? 400
          : 500;
        return await renderSite(context, site, error, status);
      }
    },
  },
] as Route[];
