import stewpot from 'stewpot/app';
import _router from 'stewpot/router';
import { redirect } from '../../src/server/respond.js';

const app = stewpot();
const router = _router();

router.get('/', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    redirect(res, `/posts${url.search}`);
    res.end();
});

router.get('/posts', (req, res) => {
    res.end('Hello from /posts');
});

app.use(router.handler);
app.listen();
