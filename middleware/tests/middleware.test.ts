import { assertEquals } from "jsr:@std/assert";
import { compose, type Middleware } from "../main.ts";

Deno.test("middleware runs in order", async () => {
    const trace: string[] = [];

    const mw1: Middleware = async (req, next) => {
        trace.push("mw1-start");
        const res = await next();
        trace.push("mw1-end");
        return res;
    };

    const mw2: Middleware = async (req, next) => {
        trace.push("mw2-start");
        const res = await next();
        trace.push("mw2-end");
        return res;
    };

    const handler = () => new Response("OK");
    const composed = compose([mw1, mw2], handler);

    await composed(new Request("http://localhost"));
    assertEquals(trace, ["mw1-start", "mw2-start", "mw2-end", "mw1-end"]);
});
