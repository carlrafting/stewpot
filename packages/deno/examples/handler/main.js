import stewpot from "../../stewpot.js";

function handler({ pathname }) {
  if (pathname === '/') {
    return () => {
        return new Response("Hello there from handler.js!");
    };
  }
}

stewpot({
  handler,
});
