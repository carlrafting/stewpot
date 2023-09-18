import { checkType } from "../../stewpot.js";
import { match } from "./routes.js";

function callAction(current, request, next) {
  const output = new Set();
  if (Array.isArray(current)) {
    const [Controller, Action] = current;
    const instance = new Controller();
    output.add(instance[Action](request, next));
  }
  if (checkType(current) === "function") {
    output.add(current(request, next));
  }
  return output;
}

export function respond({
  handlers = new Set(),
  request = new Request(url),
}) {
  console.log(request.url);
  // console.log("respond handlers", handlers);
  const work = () => {
    if (handlers.size > 0) {
      handlers = [...handlers]; // mutates handlers to array :/
      for (let i = handlers.length - 1; i > 0; i--) {
        const current = handlers[i];
        const next = handlers[i - 1];
        if (!next) {
          break;
        }
        if (current) {
          return callAction(current, request, next);
        }
      }
    }
    throw new Deno.errors.Http("Not Found!", { cause: handlers.size });
  };
  const body = work();
  return new Response(body);
}

export function serve(handler = (req) => respond(match("/", req))) {
  return Deno.serve(handler);
}
