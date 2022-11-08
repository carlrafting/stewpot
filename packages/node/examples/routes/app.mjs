import r from 'stewpot/router';
import stewpot from 'stewpot/app';

const app = stewpot();
const router = r();

router
    .get('/', (_, response) => {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(
            JSON.stringify({
                data: 'Hello World!',
            })
        );
    })
    .get('/home', (_, response) => {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(
            JSON.stringify({
                data: 'Welcome Home!',
            })
        );
    });

app.use(router.handler);
app.listen();
