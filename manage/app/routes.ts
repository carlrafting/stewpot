import type { Route } from "../http/routes.ts";
import homeRoute from "./handlers/home.ts";
import documentsRoutes from "./handlers/documents.ts";
import buildsRoutes from "./handlers/builds.ts";
export const routes: Route[] = [
  homeRoute,
  ...documentsRoutes,
  ...buildsRoutes,
];
