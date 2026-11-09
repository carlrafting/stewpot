import { html, text } from "../../http/response.ts";
import type { Route } from "../../http/routes.ts";
import nav from "../nav.ts";

export default [
  {
    name: "library",
    method: "GET",
    pathname: "/library/",
    async handler({ render, url, headers, flash }) {
      const title = "Library";
      const description = "This is the library...";
      const success = await flash.get("success");
      const page = await render("library/index.vto");
      const body = await page({ title, description, url, nav, success });
      return html(body, { headers });
    },
  },
  {
    name: "new_library",
    method: "GET",
    pathname: "/library/new/",
    async handler({ flash, render, url, headers }) {
      const title = "New Library";
      const description = "Create new library source...";
      const success = await flash.get("success");
      const page = await render("library/new.vto");
      const body = await page({ title, description, url, nav, success });
      return html(body, { headers });
    },
  },
  {
    name: "library_upload",
    method: "POST",
    pathname: "/library/upload/",
    async handler() {
      return text("File uploads are not available yet.", { status: 501 });
    },
  },
] as Route[];
