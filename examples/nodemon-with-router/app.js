import { stewpot as application, router } from 'stewpot';

const app = application();

router.clear();

router
  .add('get', 'root', '/', (_, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        data: 'Hello World!',
      })
    );
  })
  .add('get', 'home', '/home/', (_, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        data: 'Welcome Home!',
      })
    );
  });

app.use((request, response) => {
  try {
    return router.route(request, response);
  } catch (error) {
    console.error({ error });
    response.end(
      JSON.stringify({
        error: error.message,
      })
    );
  }
});
app.run();
