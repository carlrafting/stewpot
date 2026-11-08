import { html, text } from "../../http/response.ts";
import type { Route, RouteContext } from "../../http/routes.ts";
import {
  collectDocumentBuildSnapshot,
  DocumentBuildError,
  writeDocumentPages,
} from "../../build/documents.ts";
import type { PublishedDocumentPage } from "../../build/documents.ts";
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
      {
        buildAdapter,
        projectRoot,
        responseCompleted,
        connections,
        request,
      }: RouteContext,
    ): Promise<Response> {
      if (!buildAdapter) {
        return text("No build adapter is configured.", { status: 503 });
      }
      if (activeBuilds.has(projectRoot)) {
        return text("A build is already running for this project.", {
          status: 409,
        });
      }
      const kv = connections.get("kv");
      if (!kv) throw new Error("No connection with provided key found!");

      activeBuilds.add(projectRoot);
      let documentsDirectory: string | undefined;
      let documents: PublishedDocumentPage[];
      try {
        documents = await collectDocumentBuildSnapshot(kv);
        documentsDirectory = await Deno.makeTempDir({
          prefix: "stewpot-documents-",
        });
        await writeDocumentPages(documents, documentsDirectory);
      } catch (error) {
        if (documentsDirectory) {
          await Deno.remove(documentsDirectory, { recursive: true });
        }
        activeBuilds.delete(projectRoot);
        if (!(error instanceof DocumentBuildError)) throw error;
        const message = error instanceof Error ? error.message : String(error);
        return text(`Unable to prepare published documents: ${message}`, {
          status: 422,
        });
      }

      if (!documentsDirectory) {
        activeBuilds.delete(projectRoot);
        throw new Error("Document build directory was not created.");
      }
      const abortController = new AbortController();
      const abort = () => abortController.abort();
      if (request.signal.aborted) {
        abort();
      } else {
        request.signal.addEventListener("abort", abort, { once: true });
      }
      responseCompleted?.catch(abort);
      const encoder = new TextEncoder();
      const stripAnsi = createAnsiStripper();
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
            output(`Prepared ${documents.length} published page(s).\n`);
            await buildAdapter.build({
              projectRoot,
              documents,
              documentsDirectory,
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
            request.signal.removeEventListener("abort", abort);
            activeBuilds.delete(projectRoot);
            await Deno.remove(documentsDirectory, { recursive: true });
            if (!abortController.signal.aborted) controller.close();
          }
        },
        cancel() {
          abortController.abort();
        },
      });

      return new Response(stream, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    },
  },
] as Route[];
