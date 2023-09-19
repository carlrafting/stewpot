import { serve, use } from "./http.js";
import { configureRoutes, map, match } from "./routes.js";

const Stewpot = {}; // namespace

Stewpot.http = {
  use,
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
