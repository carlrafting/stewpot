/** Context provided to an adapter while it builds a project. */
export interface BuildContext {
  /** Absolute path to the directory containing the app entrypoint. */
  projectRoot: string;
  /** Aborted when the request that started the build is cancelled. */
  signal: AbortSignal;
  /** Write a build-output chunk to the response stream. */
  write: (output: string) => void;
}

/** A build system that can be configured when creating a Manage app. */
export interface BuildAdapter {
  /** Human-readable name shown on the Build page. */
  name: string;
  /** Run the build and write output as it becomes available. */
  build(context: BuildContext): Promise<void>;
}

/** Runs the configured `deno task lume` in the project root. */
export const lumeBuildAdapter: BuildAdapter = {
  name: "Lume",
  async build({ projectRoot, signal, write }) {
    const process = new Deno.Command("deno", {
      args: ["task", "lume"],
      cwd: projectRoot,
      stdout: "piped",
      stderr: "piped",
    }).spawn();

    const onAbort = () => {
      try {
        process.kill("SIGTERM");
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) throw error;
      }
    };
    signal.addEventListener("abort", onAbort, { once: true });

    async function forward(stream: ReadableStream<Uint8Array>) {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        write(decoder.decode(value, { stream: true }));
      }
      write(decoder.decode());
    }

    try {
      const [status] = await Promise.all([
        process.status,
        forward(process.stdout),
        forward(process.stderr),
      ]);
      if (!status.success) {
        throw new Error(`Lume exited with code ${status.code}.`);
      }
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  },
};
