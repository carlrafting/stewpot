import application from 'stewpot/src/server/application.js';

application(null, (_, response) => {
  response.end('<h1>Hello World</h1>');
}).run();
