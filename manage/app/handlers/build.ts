import { html, text } from "../../http/response.ts";
import type { Route, RouteContext } from "../../http/routes.ts";
import { createAnsiStripper } from "../../build/ansi.ts";
import nav from "../nav.ts";

const activeBuilds = new Set<string>();

export default [
  {
    name: "build_index",
    method: "GET",
    pathname: "/build/",
    async handler({ render, url, headers, buildAdapter }) {
      const title = "Build";
      const description = "Build the site for this project.";
      const page = await render("build/index.vto");
      const body = await page({
        title,
        description,
        url,
        nav,
        adapterName: buildAdapter?.name,
      });
      return html(body, { headers });
    },
  },
  {
    name: "run_build",
    method: "POST",
    pathname: "/build/run/",
    async handler(
      { buildAdapter, projectRoot, responseCompleted }: RouteContext,
    ): Promise<Response> {
      if (!buildAdapter) {
        return text("No build adapter is configured.", { status: 503 });
      }
      if (activeBuilds.has(projectRoot)) {
        return text("A build is already running for this project.", {
          status: 409,
        });
      }

      activeBuilds.add(projectRoot);
      const encoder = new TextEncoder();
      const stripAnsi = createAnsiStripper();
      const abortController = new AbortController();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const output = (value: string) => {
            if (!abortController.signal.aborted) {
              const plainText = stripAnsi(value);
              if (plainText) controller.enqueue(encoder.encode(plainText));
            }
          };
          try {
            output(`Starting ${buildAdapter.name} build...\n`);
            await buildAdapter.build({
              projectRoot,
              signal: abortController.signal,
              write: output,
            });
            output("\nBuild completed successfully.\n");
          } catch (error) {
            if (!abortController.signal.aborted) {
              const message = error instanceof Error
                ? error.message
                : String(error);
              output(`\nBuild failed: ${message}\n`);
            }
          } finally {
            activeBuilds.delete(projectRoot);
            if (!abortController.signal.aborted) controller.close();
          }
        },
        cancel() {
          abortController.abort();
        },
      });

      responseCompleted?.catch(() => abortController.abort());
      return new Response(stream, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    },
  },
] as Route[];
