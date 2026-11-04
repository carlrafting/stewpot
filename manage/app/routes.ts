import type { Route } from "../http/routes.ts";
import homeRoute from "./handlers/home.ts";
import documentsRoutes from "./handlers/documents.ts";

export const routes: Route[] = [
  homeRoute,
  ...documentsRoutes,
];
