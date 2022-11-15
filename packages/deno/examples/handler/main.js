import stewpot from "../../stewpot.js";

function handler() {
  return new Response("Hello there from handler.js!");
}

stewpot({
  handler,
});
