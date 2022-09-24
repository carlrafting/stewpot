import { stewpot } from 'stewpot';

const app = stewpot();

app.use((_, response) => {
  response.end('<h1>Hello World</h1>');
});
app.run();
