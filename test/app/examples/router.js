import { Router } from "../../../stewpot.js";

export default () => {
  const router = new Router();

  router.add("GET", "/", async ({ render }) => {
    return await render("index");
  });

  router.add("GET", "/posts", async ({ render }) => {
    return await render("posts/index");
  });

  router.add("GET", "/boom", () => {
    throw Error("BOOM!");
  });

  return {
    router,
  };
};
