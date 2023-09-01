import { Eta } from "../deps.js";

export default () => {
  const templateFormat = "eta";

  return function etaPlugin({ state }) {
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
};
