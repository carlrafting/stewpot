import { respond, serve } from "./http.js";
import { configureRoutes, map, match } from "./routes.js";

const Stewpot = {}; // namespace

Stewpot.http = {
  respond,
  serve,
};

Stewpot.routes = {
  map,
  match,
  configure: configureRoutes,
};

export default function main() {
  return Object.freeze(Stewpot);
}

export { main };
