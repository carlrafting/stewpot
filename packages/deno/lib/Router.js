export class Router {
  constructor() {
    this.#routes = {
      "GET": [],
      "POST": [],
      "PUT": [],
      "PATCH": [],
    };
  }
  #routes;
  add(method, pathname, handler) {
    this.#routes[method].push({
      pathname,
      pattern: new URLPattern({ pathname }),
      handler,
    });
  }
  find(method, url) {
    for (const r of this.#routes[method]) {
      if (r.pattern.test(url)) {
        const params = r.pattern.exec(url).pathname.groups;
        return {
          handler: r.handler,
          params,
        };
      }
    }
  }
  async route({ state, request, render }) {
    const match = this.find(request.method, request.url);

    if (match) {
      return await match.handler({
        state,
        request,
        params: match.params,
        render,
      });
    }

    return new Response(null, { status: 404 });
  }
}
