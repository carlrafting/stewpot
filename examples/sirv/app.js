import { stewpot } from 'stewpot';
import sirv from 'sirv';

const app = stewpot();

app.use((request, response) => {
    const servePublic = sirv('./public');

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
});
app.run();
