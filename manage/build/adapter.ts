import type { PublishedDocumentPage } from "./documents.ts";

/** Context provided to an adapter while it builds a project. */
export interface BuildContext {
  /** Absolute path to the directory containing the app entrypoint. */
  projectRoot: string;
  /** Immutable snapshot of published documents and their blocks. */
  documents: readonly PublishedDocumentPage[];
  /** Temporary directory containing generated static pages for this build. */
  documentsDirectory: string;
  /** Aborted when the request that started the build is cancelled. */
  signal: AbortSignal;
  /** Write a build-output chunk to the response stream. */
  write: (output: string) => void;
}

/** A project-specific builder that can consume Manage's published documents. */
export interface BuildAdapter {
  /** Human-readable name shown on the Build page. */
  name: string;
  /** Run the build and write output as it becomes available. */
  build(context: BuildContext): Promise<void>;
}
