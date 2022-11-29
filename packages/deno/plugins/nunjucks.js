import { nunjucks } from "../deps.js";

export default () => {
  const templateFormat = "njk";

  return function nunjucksPlugin({ state }) {
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
};
