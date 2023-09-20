import { checkType } from "../../stewpot.js";
import { compose, use } from "./http.js";
import Stewpot from "./main.js";

const stewpot = Stewpot();

class BaseController {
  constructor() {}
  prepare() {
  }
  render() {
  }
  respond(action) {
    return new Response();
  }
}

class HomeController extends BaseController {
  index() {
    return "hello home!";
  }
  create(req) {
    return {
      url: req.url,
      id: 1,
      foo: "bar",
      date: new Date().toISOString(),
    };
  }
}

function foobar(_req) {
  return "hello foobar!";
}

async function all(request, next) {
  next && await next;
  console.log({ next });
  console.log("hello from all middleware!", request.url);
}

async function middleware(request, next) {
  console.log("hello from middleware", request.url);
  next && await next;
  console.log({ next });
}

stewpot.routes.configure("*", (routes) => {
  routes.all(all);
});

stewpot.routes.configure("/", (routes) => {
  routes.get("/", [HomeController, "index"]);
  routes.post("/", [HomeController, "create"]);
  routes.get("/foobar", foobar);
});

export const app = (req) => {
  if (!req) {
    throw new Error("Expected argument to be a Request!");
  }
  const method = req.method;
  const url = new URL(req.url);
  if (url.pathname === "/foobar" && method === "GET") {
    return foobar(req);
  }
  if (url.pathname === "/" && method === "GET") {
    const instance = new HomeController();
    return instance.index(req);
  }
  if (url.pathname === "/" && method === "POST") {
    const instance = new HomeController();
    return instance.create(req);
  }
  throw new Error("Not Found", 404);
};

export function handler(req, next) {
  // typeof next === "function" && next(req);
  console.log("final response!");
  return "hello there";
}

if (import.meta.main) {
  stewpot.http.serve(handler);
}
