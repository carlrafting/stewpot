import lume from "lume/mod.ts";
import prism from "lume/plugins/prism.ts";
import slugify from "lume/plugins/slugify_urls.ts";
import date from "lume/plugins/date.ts";
import meta from "./packages/deno/stewpot.json" assert { type: "json" };

const site = lume({
  src: 'www/src',
  dest: "www/dist"
});

site.use(date());
site.use(slugify())
site.use(prism());

for (const [key, value] of Object.entries(meta)) {
    site.data(key, value);
}

site.remoteFile("_includes/footer.html", "packages/deno/templates/footer.html");
site.remoteFile("_includes/header.njk", "packages/deno/templates/header.html");
site.remoteFile("css/code.css", "packages/deno/templates/code.css");
site.remoteFile("css/global.css", "packages/deno/templates/global.css");
site.remoteFile("css/basic.css", "packages/deno/templates/basic.css");
site.remoteFile("index.md", "readme.md");
// site.copy('css');
site.loadAssets([".css", ".html"]);

export default site;
