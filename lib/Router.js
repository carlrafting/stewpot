export class Router {
  constructor() {
    this.#routes = {
      "GET": [],
      "POST": [],
      "PUT": [],
    };
  }
  #routes;
  add(method, pathname, handler) {
    this.#routes[method].push({
      pattern: new URLPattern({ pathname }),
      handler,
    });
  }
  async route(req) {
    for (const r of this.#routes[req.method]) {
      if (r.pattern.test(req.url)) {
        const params = r.pattern.exec(req.url).pathname.groups;
        return await r["handler"](req, params);
      }
    }
    return new Response(null, { status: 404 });
  }
}
