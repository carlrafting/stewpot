import { logger } from 'stewpot/middleware';
import r from 'stewpot/router';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { createReadStream } from 'node:fs';
import { headers, html } from './respond.js';
import mime from './mime.js';
import { parse } from './url.js';

const url = new URL(import.meta.url);
const dirname = path.dirname(fileURLToPath(url.href));
const srcPath = path.join(dirname, '..');

export default function defaultHandler() {
    const router = r();

    function render(_, res) {
        html(_, res, { template: 'index.html' }, { title: 'Stewpot' });
    }

    router.use(logger);

    router.get('/styles.css', (req, res) => {
        const _url = parse(req);
        try {
            headers(res, { 'Content-Type': mime.css });
            createReadStream(path.join(srcPath, 'static', _url.pathname)).pipe(
                res
            );
        } catch (_) {
            console.log(_);
        }
    });

    router.get('/', (_, res) => {
        headers(res, { 'Content-Type': mime.html });
        render(_, res);
    });

    return {
        handler: router.handler,
    };
}
