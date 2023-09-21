import * as http from "./http.js";
import * as routes from "./routes.js";

export default function main() {
  const stewpot = {
    http,
    routes,
  };
  return Object.freeze(stewpot);
}

export { main };
