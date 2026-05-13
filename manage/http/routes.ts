import type { TemplateRenderFunction } from "@stewpot/manage";
import { notFound } from "./response.ts";

export type RouteMethod = "GET" | "POST";

export interface RouteContext {
  request: Request;
  url: URL;
  headers: Headers;
  render: (file: string) => Promise<TemplateRenderFunction>;
  connections: Map<string, Deno.Kv>;
}

export interface Route {
  name: string;
  method: RouteMethod;
  handler: (context: RouteContext) => Promise<Response>;
  pathname?: string;
  url?: string;
  pattern?: URLPattern;
}

async function notFoundHandler(
  { render, url }: RouteContext,
): Promise<Response> {
  const title = "Page was not found!";
  const template = await render("errors/not_found.vto");
  const page = await template({ title, url });
  return notFound(page);
}

export async function matchRoutes(
  routes: Route[],
  context: RouteContext,
): Promise<Response> {
  const request = context.request;
  const url = new URL(request.url);
  const method: string = request.method as RouteMethod;

  for (const route of routes) {
    const routeURL = route?.url ?? route?.pathname;
    const pattern = route?.pattern;
    if (routeURL) {
      const match = url.pathname === routeURL && method === route.method;
      if (match) {
        return await route.handler(context);
      }
    }
    if (pattern) {
      const match = route.pattern?.exec(url);
      if (match) {
        return await route.handler(context);
      }
    }
  }

  return await notFoundHandler(context);
}
