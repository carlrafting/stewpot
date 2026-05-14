import type { Route } from "../http/routes.ts";

export interface NavData {
  text: string;
  href: string;
}

export interface DocumentData {
  title: string;
  content: string;
  created: string;
}

export interface RouteData {
  name: string;
  path: string;
  type: "static" | "dynamic";
  ref: string;
}

export interface PageContext {
  title: string;
  description: string;
  url: URL;
  nav: NavData[];
  routes: Route[];
  data: {
    routes?: RouteData[];
    documents?: DocumentData[];
  };
}
