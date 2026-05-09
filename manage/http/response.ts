export function html(body: BodyInit, headers: HeadersInit = []) {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...headers,
    },
  });
}
