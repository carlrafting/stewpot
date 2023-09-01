import vento from "https://deno.land/x/vento/mod.ts";

export default () => {
  const templateFormat = "vto";

  return function ventoPlugin({ state }) {
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
};
