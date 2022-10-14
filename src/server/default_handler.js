import { logger } from 'stewpot/middleware';
import r from 'stewpot/router';
import nunjucks from 'nunjucks';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { createReadStream } from 'node:fs';
import { headers } from './respond.js';
import mime from './mime.js';
import { parse } from './url.js';

const url = new URL(import.meta.url);
const dirname = path.dirname(fileURLToPath(url.href));
const srcPath = path.join(dirname, '..');

export default function defaultHandler() {
    const router = r();

    nunjucks.configure(path.join(srcPath, 'templates'), {
        watch: true,
    });

    async function render(_, res) {
        return nunjucks.render(
            'index.html',
            { title: 'Stewpot' },
            (err, template) => {
                if (err) {
                    console.error({ err });
                }
                return res.end(template);
            }
        );
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
