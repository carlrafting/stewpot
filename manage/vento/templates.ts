import vento from "ventojs/mod.js";
import type { Options as VentoOptions } from "ventojs/mod.js";
import denoConfig from "../deno.json" with { type: "json" };
import {
  type Extract,
  // extractJson,
  // extractToml,
  extractYaml,
  type Format as FrontMatterFormat,
  test as testFM,
} from "@std/front-matter";

const globalTemplateData = {
  version: denoConfig.version,
};

export type TemplateRenderFunction = (
  data: Record<string, unknown> | undefined,
) => Promise<string>;

export function createTemplateRender(options: VentoOptions) {
  return (async (
    file: string,
  ): Promise<TemplateRenderFunction> => {
    const templates = vento(options);
    const template = await templates.load(file);
    // console.log({ template });
    const source = template.source;
    const frontmatterFormat = "yaml";
    const hasFrontmatter = testFM(source, [frontmatterFormat]);
    // const hasFrontmatter = false;
    return async (data: Record<string, unknown> | undefined) => {
      if (!hasFrontmatter) {
        const view = await template({ ...globalTemplateData, ...data });
        return view.content;
      }
      const frontmatterData: Extract<FrontMatterFormat> = extractYaml(source);
      const attrs = frontmatterData;
      const view = await templates.runString(frontmatterData.body, {
        ...globalTemplateData,
        ...attrs,
        ...data,
      });
      return view.content;
    };
  });
}

export type { VentoOptions };
