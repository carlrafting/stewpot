import { logger } from '../middleware/logger.js';
import r from './router.js';
import nunjucks from 'nunjucks';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { createReadStream } from 'node:fs';

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

    router.get('/style.css', (_, res) => {
        res.setHeader('Content-Type', 'text/css');
        createReadStream(path.join(srcPath, 'static', 'style.css')).pipe(res);
    });

    router.get('/', (_, res) => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        render(_, res);
    });

    return {
        handler: router.handler,
    };
}
