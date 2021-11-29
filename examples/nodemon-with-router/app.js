import { application, router } from 'stewpot';

router
  .add('root', 'get', '/', (request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        data: 'Hello World!',
      })
    );
  })
  .add('home', 'get', '/home/', (request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        data: 'Welcome Home!',
      })
    );
  });

application(null, (request, response) => {
  try {
    return router.route(request, response);
  } catch (error) {
    console.error(error);
    response.end(
      JSON.stringify({
        error: error.message,
      })
    );
  }
}).run();
