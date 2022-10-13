import http from 'node:http';
import router from 'stewpot/router';

const controller = new AbortController();
const host = '127.0.0.1';
const port = 80;
const protocol = 'http://';
// const protocol = 'https://'; // set to https protocol if using node.js https module.

const r = router()
    .use('/', function mw(_, res) {
        res.write('hello from mw \n');
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
