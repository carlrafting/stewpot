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
    for (const route of this.#routes[method]) {
      if (route.pattern.test(url)) {
        const params = route.pattern.exec(url).pathname.groups;
        return {
          handler: route.handler,
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
