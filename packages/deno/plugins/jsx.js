import { renderToString } from "preact-render-to-string";

export default () => {
  const templateFormat = "jsx";

  return function jsxPlugin({ state }) {
    state.templateFormats.push(templateFormat);

    // function configure(templateDir) {}

    return {
      type: "template",
      name: "jsx",
      templateFormat,
      renderInline(template /* data */) {
        return renderToString(template);
      },
      /* async renderFile(templateDir, template, data) {

      }, */
    };
  };
};
