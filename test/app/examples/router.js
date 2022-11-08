import { Router } from "stewpot";

const router = new Router();

router.add("GET", "/", async ({ render }) => {
  return new Response(
    await render("index"),
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
});

router.add("GET", "/posts", async ({ render }) => {
  return new Response(
    await render("posts/index"),
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
});

router.add("GET", "/boom", () => {
  throw Error("BOOM!");
});

export { router };
