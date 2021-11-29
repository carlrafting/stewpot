import { logger } from '../middleware/logger.js';
import router from './router.js';
import nunjucks from 'nunjucks';
import path from 'node:path';
import sirv from 'sirv';

router.add('root', 'GET', '/', (_, response) => {
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  return nunjucks.render('index.html', { title: 'Stewpot' }, (err, template) => {
    if (err) {
      console.error({ err });
    }
    return response.end(template);
  });
});

export default function handler(request, response) {
  nunjucks.configure(path.resolve('src/templates'), {
    watch: true,
  });
  
  const serveStatic = sirv(path.resolve('src/static'), {
    maxAge: 0
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
