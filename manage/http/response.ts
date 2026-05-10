export function html(body: BodyInit, options?: ResponseInit): Response {
  const headers = new Headers();
  headers.set("content-type", "text/html; charset=utf-8");
  if (options !== undefined) {
    return new Response(body, {
      headers,
      ...options,
    });
  }
  return new Response(body, {
    headers,
  });
}

type Data = Record<string, unknown> | string[] | number[];

export function json(data: Data, options?: ResponseInit): Response {
  const headers = new Headers();
  headers.set("content-type", "application/json");
  const stringified = JSON.stringify(data);
  return new Response(stringified, {
    headers,
    ...options,
  });
}

export function text(body: string, options?: ResponseInit): Response {
  const headers = new Headers();
  headers.set("content-type", "text/plain");
  return new Response(body, {
    headers,
    ...options,
  });
}
