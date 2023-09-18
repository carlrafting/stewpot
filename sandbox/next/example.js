import { checkType } from "../../stewpot.js";
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
    return JSON.stringify({
      url: req.url,
      id: 1,
      foo: "bar",
      date: new Date().toISOString(),
    });
  }
}

function foobar(_req, message) {
  console.log({ message });
  return "hello foobar!";
}

function all(request, next) {
  console.log("i love log!", request);
  return next(request, (req) => "hello all");
}

function middleware(request, next) {
  console.log("hello from middleware");
  return next(request, noop);
}

stewpot.routes.configure("*", (routes) => {
  routes.all(all);
});

stewpot.routes.configure("/", (routes) => {
  routes.get("/", [HomeController, "index"]);
  routes.post("/", [HomeController, "create"]);
  routes.get("/foobar", foobar);
});

const noop = () => {};

if (import.meta.main) {
  stewpot.http.serve((req) => {
    const method = req.method;
    const url = new URL(req.url);
    console.log(url);
    const work = () => {
      const inner = () => {
        if (url.pathname === "/foobar" && method === "GET") {
          return foobar(req, noop);
        }
        if (url.pathname === "/" && method === "GET") {
          const instance = new HomeController();
          return instance.index(req, noop);
        }
        if (url.pathname === "/" && method === "POST") {
          const instance = new HomeController();
          return instance.create(req, noop);
        }
        throw {
          code: 404,
          message: "Not Found",
        };
      };
      const outer = (req, ...fns) => {
        // return fn(req, inner);
        // return fns.reduce((prev, current) => prev(req, current));
        return (inner = () => {}) => {
          console.log("fns.length", fns.length);
          for (let i = 0; i < fns.length; i++) {
            const current = fns[i];
            const next = fns[i + 1] || noop;
            /*  if (!next) {
              break;
            } */
            console.log({
              current,
              next,
            });
            current(req, next);
            if (i === fns.length) {
              return current(req, inner(req, next));
            }
          }
        };
      };
      try {
        // return all(req, inner);
        return outer(req, middleware, all)(inner);
      } catch (error) {
        throw error;
      }
    };
    try {
      const headers = new Headers();
      const result = work();
      let body = null;
      if (checkType(body) === "string") {
        headers.set("content-type", "text/plain");
        body = result;
      }
      if (checkType(body) === "object" || checkType(body) === "array") {
        headers.set("content-type", "application/json");
        body = JSON.stringify(result);
      }
      return new Response(body, { status: 200, headers });
    } catch (error) {
      throw error;
      return new Response(error.message, {
        status: error.code,
      });
    }
  });
}
