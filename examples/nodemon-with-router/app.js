import { stewpot as application, useRouter } from 'stewpot';

const app = application();
const router = useRouter(); 

// router.clear();

router
  .get('root', (_, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        data: 'Hello World!',
      })
    );
  })
  .get('home', (_, response) => {
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
