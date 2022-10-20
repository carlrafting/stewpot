import { logger } from 'stewpot/middleware';
import r from 'stewpot/router';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { createReadStream } from 'node:fs';
import { headers, html } from './respond.js';
import { parse } from './url.js';
import pkg from '../../package.json' assert { type: 'json' };

const url = new URL(import.meta.url);
const dirname = path.dirname(fileURLToPath(url.href));
const srcPath = path.join(dirname, '..');

export default function defaultHandler() {
    const router = r();

    function render(_, res, template = 'index.html') {
        html(_, res, { template }, { title: 'Stewpot', version: pkg.version });
    }

    router.use(logger);

    router.get('/styles.css', (req, res) => {
        const _url = parse(req);
        try {
            headers(res, 'css');
            createReadStream(path.join(srcPath, 'static', _url.pathname)).pipe(
                res
            );
        } catch (_) {
            console.log(_);
        }
    });

    router.get('/', (_, res) => {
        headers(res, 'html');
        render(_, res);
    });

    return {
        handler: router.handler,
    };
}
