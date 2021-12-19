import { stewpot } from 'stewpot';
import nunjucks from 'nunjucks';
import path from 'node:path';

const app = stewpot();

nunjucks.configure(path.join('.', 'views'), {
  watch: true,
});

function handler(_, response) {
  nunjucks.render('index.html', { title: 'Nunjucks!' }, (err, template) => {
    if (err) {
      console.error({ err });
    }
    response.end(template);
  });
}

app.use(handler)
app.run();
