import application from '../../src/server/application.js';

const app = application();
console.log('app.config', app.config);
app.run();

// const app_two = application({ port: 8080 });
// app_two.run();
