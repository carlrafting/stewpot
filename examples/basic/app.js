import application from 'stewpot/src/server/application.js';
import config from './stewpot.config.js';

const app = application(config);
app.run();
// hello world
