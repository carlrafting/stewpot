import http from 'node:http';
import { headers } from '../../src/server/respond.js';

http.createServer()
    .on('request', (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        console.log(url);

        if (url.pathname === '/') {
            headers(res, 301, { Location: `/foobar${url.search}` });
            res.end();
            return;
        }
        if (url.pathname === '/foobar') {
            res.end('Hello from /foobar');
            return;
        }

        res.writeHead(404, {
            'Content-Type': 'text/plain',
        });
        res.end(http.STATUS_CODES[404]);
    })
    .listen(3000, () =>
        console.log('Listening for requests on localhost:3000')
    );
