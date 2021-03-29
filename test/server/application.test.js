import application from '../../src/server/application.js';

const app = application();
console.log('app.config', app.config);
app.run();
