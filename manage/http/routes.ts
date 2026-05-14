import type { TemplateRenderFunction } from "@stewpot/manage";
import { html, notFound } from "./response.ts";

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
  const text = "Sorry, couldn't find that!";
  const template = await render("errors/not_found.vto");
  const page = await template({ title, text, url });
  return notFound(page);
}

async function serverErrorHandler({ render, url }: RouteContext) {
  const title = "Internal Server Error";
  const text = "Application encoutered an unexpected error. Sorry about that.";
  const status = 500;
  const template = await render("errors/server.vto");
  const page = await template({ title, text, url });
  return html(page, {
    status,
  });
}

export async function matchRoutes(
  routes: Route[],
  context: RouteContext,
): Promise<Response> {
  const request = context.request;
  const url = new URL(request.url);
  const method: string = request.method as RouteMethod;

  for (const route of routes) {
    const routeURL = route.url ?? route.pathname;
    const matchMethod = method === route.method;
    const matchPathname = routeURL
      ? url.pathname === routeURL
      : route.pattern?.exec(url) ?? false;
    if (matchMethod && matchPathname) {
      try {
        return await route.handler(context);
      } catch (error) {
        console.error(
          "error",
          `route handler error on ${method} ${url.pathname}`,
          { error },
        );
        return await serverErrorHandler(context);
      }
    }
  }

  return await notFoundHandler(context);
}
