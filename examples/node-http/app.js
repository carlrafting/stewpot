import http from 'node:http';
import router from 'stewpot/router';

const controller = new AbortController();
const host = '127.0.0.1';
const port = 80;
const protocol = 'http://';
// const protocol = 'https://'; // set to https protocol if using node.js https module.

const r = router()
    .use('/', function middleware(_, res) {
        res.write('hello from middleware \n');
    })
    .get('/', function home(_, res) {
        res.end('hello from /');
    })
    .get('/posts', function posts(_, res) {
        res.end('hello from /posts');
    })
    .get('/posts/:title', function post(_, res) {
        res.end('hello from /posts/:id');
    });

const server = http.createServer(r.handler);

server.listen(
    {
        host,
        port,
        signal: controller.signal,
    },
    () => {
        const { address, port } = server.address();
        console.log(
            `Listening on ${protocol}${address}${
                [80, 443].includes(port) === false ? `:${port}` : ''
            }`
        );
    }
);
