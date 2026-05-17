import type { Route } from "../http/routes.ts";
import homeRoute from "./handlers/home.ts";
import documentsRoutes from "./handlers/documents.ts";
import routesRoute from "./handlers/routes.ts";
import libraryRoutes from "./handlers/library.ts";
import sessionsRoute from "./handlers/sessions.ts";
import settingsRoute from "./handlers/settings.ts";
export const routes: Route[] = [
  homeRoute,
  routesRoute,
  ...documentsRoutes,
  ...libraryRoutes,
  sessionsRoute,
  settingsRoute,
];
