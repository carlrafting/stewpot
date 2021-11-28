import application from 'stewpot/src/server/application.js';
import * as router from 'stewpot/src/server/router.js';

router
  .add('root', 'get', '/', (request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({
      data: 'Hello World!'
    }));
  })
  .add('home', 'get', '/home/', (request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({
      data: 'Welcome Home!'
    }));
  });

const app = application(null, (request, response) => {
  try {
    return router.route(request, response);
  } catch (error) {
    console.error(error);
    response.end(JSON.stringify({
      error: error.message
    }));
  }
});
app.run();
