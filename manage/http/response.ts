import { STATUS_CODE, STATUS_TEXT } from "@std/http/status";

export function html(body: BodyInit, options?: ResponseInit): Response {
  const headers = new Headers(options?.headers);
  const status: number = options?.status ?? STATUS_CODE.OK;
  const statusText: string = options?.statusText ?? STATUS_TEXT[200];
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(body, {
    headers,
    status,
    statusText,
  });
}

type Data = Record<string, unknown> | string[] | number[];

export function json(data: Data, options?: ResponseInit): Response {
  const headers = new Headers(options?.headers);
  const status: number = options?.status ?? STATUS_CODE.OK;
  const statusText: string = options?.statusText ?? STATUS_TEXT[200];
  headers.set("content-type", "application/json; charset=utf-8");
  const stringified = JSON.stringify(data);
  return new Response(stringified, {
    headers,
    status,
    statusText,
  });
}

export function text(body: string, options?: ResponseInit): Response {
  const headers = new Headers();
  headers.set("content-type", "text/plain; charset=utf-8");
  return new Response(body, {
    headers,
    ...options,
  });
}

export function notFound(body: string) {
  const status = STATUS_CODE.NotFound;
  const statusText = STATUS_TEXT[status];
  const headers = new Headers();
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(body, {
    headers,
    status,
    statusText,
  });
}
