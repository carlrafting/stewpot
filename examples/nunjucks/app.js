import { application } from 'stewpot';
import nunjucks from 'nunjucks';

nunjucks.configure('./views', {
  watch: true,
});

function handler(_, response) {
  // console.log(nunjucks);
  nunjucks.render('index.html', { title: 'Nunjucks!' }, (err, template) => {
    if (err) {
      console.error({ err });
    }
    response.end(template);
  });
}

application({ server: { port: 8081 } }, handler).run();
