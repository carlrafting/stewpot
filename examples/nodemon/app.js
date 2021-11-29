import { application } from 'stewpot';

application(null, (_, response) => {
  response.end('<h1>Hello World</h1>');
}).run();
