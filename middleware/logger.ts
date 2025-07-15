import { NextHandler } from "./main.ts";

export async function logger(req: Request, next: NextHandler): Promise<Response> {
    console.log(`--> ${req.method} ${req.url}`);
    const res = await next();
    console.log(`<-- ${res.status}`);
    return res;
}

export default logger;
