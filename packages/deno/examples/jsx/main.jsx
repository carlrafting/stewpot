import stewpot from "stewpot/stewpot.js";
import { renderToString } from "preact-render-to-string";

function page() {
  return (
    <div>
      <h1>Current time</h1>
      <p>{new Date().toLocaleString()}</p>
    </div>
  );
}

const message = 'hello'

function handler({ pathname }) {
  if (pathname === "/") {
    return {
      respond() {
        const html = renderToString(page());
        // console.log(page,html)
        return new Response(html, {
          headers: {
            "content-type": "text/html"
          }
        })
      }
    }
  }
}

stewpot({
  handler
});
