import type { Route } from "../http/routes.ts";
import homeRoute from "./handlers/home.ts";
import documentsRoutes from "./handlers/documents.ts";
import devRoutes from "./handlers/dev.ts";
import buildRoutes from "./handlers/build.ts";

export const routes: Route[] = [
  homeRoute,
  ...documentsRoutes,
  ...devRoutes,
  ...buildRoutes,
];
