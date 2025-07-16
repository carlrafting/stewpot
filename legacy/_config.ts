import lume from "lume/mod.ts";
import prism from "lume/plugins/prism.ts";
import slugify from "lume/plugins/slugify_urls.ts";
import date from "lume/plugins/date.ts";
import meta from "./stewpot.json" with { type: "json" };

const site = lume({
  src: "www",
  dest: "dist",
});

site.use(date());
site.use(slugify());
site.use(prism());

for (const [key, value] of Object.entries(meta)) {
  site.data(key, value);
}

site.remoteFile("_includes/footer.vto", "templates/footer.html");
site.remoteFile("_includes/header.vto", "templates/header.html");
site.remoteFile("css/code.css", "static/code.css");
site.remoteFile("css/global.css", "static/global.css");
site.remoteFile("css/basic.css", "static/basic.css");
site.remoteFile("index.md", "readme.md");
site.copy("css");

site.add([".css", ".html"]);

export default site;
