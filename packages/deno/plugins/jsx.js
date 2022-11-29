import { renderToString } from "preact-render-to-string";

export default ({ pageHtml } = {}) => {
  const templateFormat = "jsx";

  const page = (title, body) =>
    pageHtml ? pageHtml(title, body) : `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
${body}`;

  return function jsxPlugin({ state }) {
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
};
