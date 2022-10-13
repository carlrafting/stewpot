import stewpot from 'stewpot/app';
import defaultHandler from './server/default_handler.js';

const app = stewpot({ port: 80 });
const { handler } = defaultHandler();

app.use(handler);
app.listen();
