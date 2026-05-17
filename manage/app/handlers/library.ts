import { html } from "../../http/response.ts";
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
    async handler({ request, flash }) {
      throw "upload feature is under development!";
      /*
      const formData = await request.formData();
      const file: File | null = formData?.get("file") as File;
      if (!file) {
        return new Response("File required but not provided.", {
          status: 400,
        });
      }
      const tmp = await Deno.makeTempFile({
        dir: "./tmp",
      });
      await Deno.writeFile(tmp, await file.bytes());
      const fileURL = new URL(`../library/${file.name}`, import.meta.url);
      await Deno.rename(tmp, fileURL);
      flash.set("success", "file uploaded successfully!");
      return Response.redirect(new URL("/library/", request.url));
      */
    },
  },
] as Route[];
