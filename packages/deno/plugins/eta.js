import { eta } from "../deps.js";

export default () => {
  const templateFormat = "eta";

  return function etaPlugin({ state }) {
    state.templateFormats.push(templateFormat);

    function configure(templateDir) {
      eta.configure({
        views: templateDir,
      });
    }

    return {
      type: "template",
      name: "eta",
      async renderFile(templateDir, template, data) {
        configure(templateDir);
        return await eta.renderFile(`/${template}`, { ...data });
      },
    };
  };
};
