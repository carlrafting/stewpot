import type { NextHandler } from "./main.ts";

/**
 * Logs each request (`--> METHOD url`) and the status of its response
 * (`<-- status`) to the console.
 */
export async function logger(
  req: Request,
  next: NextHandler,
): Promise<Response> {
  console.log(`--> ${req.method} ${req.url}`);
  const res = await next();
  console.log(`<-- ${res.status}`);
  return res;
}

export default logger;
