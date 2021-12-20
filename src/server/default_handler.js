import { logger } from '../middleware/logger.js';
import router from './router.js';
import nunjucks from 'nunjucks';
import path from 'node:path';
import sirv from 'sirv';
import { fileURLToPath, URL } from 'node:url';

const url = new URL(import.meta.url);
const dirname = path.dirname(fileURLToPath(url.href));
const srcPath = path.join(dirname, '..');

router.clear();

router.add('get', 'root', '/', (_, response) => {
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  return nunjucks.render(
    'index.html',
    { title: 'Stewpot' },
    (err, template) => {
      if (err) {
        console.error({ err });
      }
      return response.end(template);
    }
  );
});

export default function defaultHandler(request, response) {
  nunjucks.configure(path.join(srcPath, 'templates'), {
    watch: true,
  });

  const serveStatic = sirv(path.join(srcPath, 'static'), {
    maxAge: 0,
  });

  logger(response, request, function () {
    try {
      serveStatic(request, response, () => {
        router.route(request, response);
      });
    } catch (error) {
      console.log('servePublic', { error });
    }
  });
}
