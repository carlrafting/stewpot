export type BuildAdapterId = "lume";

export interface BuildInspection {
  adapter: BuildAdapterId;
  projectDetected: boolean;
  configFiles: string[];
  checks: { label: string; value: string }[];
  outputDirectory: string;
  outputExists: boolean;
  outputIsDirectory: boolean;
  outputEntries: { name: string; isDirectory: boolean }[];
  outputEntriesTruncated: boolean;
}

export interface BuildAdapter {
  id: BuildAdapterId;
  name: string;
  inspect(sitePath: string, outputDirectory: string): Promise<BuildInspection>;
}
