import { application } from 'stewpot';
import sirv from 'sirv';

const servePublic = sirv('public', {
  maxAge: 0, // 0 for development environment
  immutable: true
});

application(null, (request, response) => {
  try {
    servePublic(request, response, () => {
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(
        `Check out /static/ for an <a href="/static/">example of serving static assets with sirv</a>.`
      );
    });
  } catch (error) {
    console.log('servePublic', { error });
  }
}).run();
