import http from 'node:http';
import router from '../../src/server/router.js';

const controller = new AbortController();
const host = '127.0.0.1';
const port = 80;
const protocol = http !== undefined ? 'http://' : 'https://';

const r = router()
    .use('/', function mw(req, res, next) {
        res.write('hello from mw \n');
        next();
    })
    .get('/', function first(_, res) {
        res.end('hello world');
    })
    .get('/foo', function second(_, res) {
        res.end('hello /foo');
    })
    .get('/foo/:id/:title', function third(_, res) {
        res.end('hello with id');
    });

function handler(req, res) {
    const { pathname, method } = new URL(req.url, `http://${req.headers.host}`);

    const matches = r.find(method, pathname);

    console.log(matches);

    res.end('Hello World!');
}

const server = http.createServer(handler);

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

function retry() {
    console.log('Retrying...');
    setTimeout(() => {
        let p = port;
        controller.abort();
        server.listen((p += 1));
    }, 1000);
}

server.on('error', (err) => {
    //console.log(err);
    if (err.code === 'EACCES') {
        console.log(
            `${err.message}. You don't have the right privileges to listen on port ${port}`
        );
        retry();
    }
    if (err.code === 'EADDRINUSE') {
        console.log(`A server is already running at port ${port}...`);
        retry();
    }
});
