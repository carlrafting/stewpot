import { application, router } from 'stewpot';
import sirv from 'sirv';

router
  .add('root', 'get', '/', (request, response) => {
    response.end(
      `Check out <a href="/static/">/static/ for an example of serving static assets with sirv.</a>.`
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

const servePublic = sirv('public', {
  maxAge: 0, // 0 for development purposes
  immutable: true
});

application(null, (request, response) => {
  try {
    servePublic(request, response, () => {
      try {
        return router.route(request, response);
      } catch (error) {
        console.error('router', error);
        response.end(
          JSON.stringify({
            error: error.message,
          })
        );
      }   
    });
  } catch (error) {
    console.log('servePublic', { error });
  }
}).run();
