// import { path, serve, serveTLS, Application, Router } from "../../deps.js";
import notFound from '../../middleware/not_found.js';
import responseTime from '../../middleware/response_time.js';
import _static from '../../middleware/static.js';

// Original server implementation in deno.

export async function server({ hostname, port, https }) {
  console.log('https', https);

  const status = await Deno.permissions.request({
    name: 'net',
    host: hostname,
  });

  if (status.state === 'denied') {
    return;
  }

  const app = new Application();
  const router = new Router();

  let certFile, keyFile;

  if (https) {
    // let { certFile, keyFile } = https;
    certFile = path.join(Deno.cwd(), https.certFile);
    keyFile = path.join(Deno.cwd(), https.keyFile);
    console.log('certFile', certFile);
    console.log('keyFile', keyFile);
  }

  // const server = https
  //   ? serveTLS({ hostname, port, certFile, keyFile })
  //   : serve({ hostname, port });

  router.get('/', (context) => {
    context.response.body = 'Hello world!';
  });

  app.addEventListener('listen', () => {
    console.log(
      `${https ? 'HTTPS' : 'HTTP'} webserver running.  Access it at:  ${
        https ? 'https' : 'http'
      }://${hostname}:${port}/`
    );
  });

  // app.use(router.routes());
  // app.use(router.allowedMethods());
  app.use(_static);
  app.use(responseTime);
  app.use(notFound);

  await app.listen({
    hostname,
    port,
    secure: https,
    certFile,
    keyFile,
  });

  // for await (const request of server) {
  //   console.log(request);

  //   let bodyContent = "Your user-agent is:\n\n";
  //   bodyContent += request.headers.get("user-agent") || "Unknown";

  //   request.respond({ status: 200, body: bodyContent });
  // }
}
