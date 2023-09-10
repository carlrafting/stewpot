import vento from "https://deno.land/x/vento@v0.7.1/mod.ts";
import { Eta } from "https://deno.land/x/eta@v3.0.3/src/index.ts";
import { default as nunjucks } from "npm:nunjucks@3.2.4";
import { renderToString } from "npm:preact-render-to-string@6.2.0";

export function etaPlugin() {
  const templateFormat = "eta";

  return ({ state }) => {
    state.templateFormats.push(templateFormat);

    function configure(templateDir) {
      return new Eta(
        templateDir
          ? {
            views: templateDir,
          }
          : null,
      );
    }

    return {
      type: "template",
      name: "etaPlugin",
      templateFormat,
      async renderString(template, data) {
        const eta = configure();
        return await eta.renderStringAsync(template, data);
      },
      async renderFile(templateDir, template, data) {
        const eta = configure(templateDir);
        return await eta.renderAsync(`${template}`, { ...data });
      },
    };
  };
}

export function jsxPlugin({ pageHtml } = {}) {
  const templateFormat = "jsx";

  const page = (title, body) =>
    pageHtml ? pageHtml(title, body) : `<!doctype html>
  <html lang="en">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${body}`;

  return ({ state }) => {
    state.templateFormats.push(templateFormat);

    // function configure(templateDir) {}

    return {
      type: "template",
      name: "jsxPlugin",
      templateFormat,
      renderInline(template, data) {
        template = renderToString(template, data || {}, {
          pretty: state.environment === "development",
        });
        return page(data.title || "Untitled", template);
      },
    };
  };
}

export function nunjucksPlugin() {
  const templateFormat = "njk";

  return ({ state }) => {
    state.templateFormats.push(templateFormat);

    function configure(templateDir) {
      return nunjucks.configure(templateDir);
    }

    return {
      type: "template",
      name: "nunjucksPlugin",
      templateFormat,
      renderString(template, data) {
        return nunjucks.renderString(template, data);
      },
      renderFile(templateDir, template, data) {
        const env = configure(templateDir);
        return env.render(`${template}.${templateFormat}`, data);
      },
    };
  };
}

export function ventoPlugin() {
  const templateFormat = "vto";

  return ({ state }) => {
    state.templateFormats.push(templateFormat);

    const config = (templateDir = null) =>
      vento({
        includes: templateDir ? `${templateDir}/includes` : "./includes",
      });

    return {
      type: "template",
      name: "ventoPlugin",
      templateFormat,
      async renderString(template, data) {
        const env = config();

        const result = await env.runString(
          template,
          data,
        );

        return result.content;
      },
      async renderFile(templateDir, template, data) {
        const env = config(templateDir);

        template = await env.load(
          `${templateDir}/${template}.${templateFormat}`,
        );

        const result = await template(data);

        console.log(result.content);

        return result.content;
      },
    };
  };
}
