import { stewpot, useRouter } from 'stewpot';

const app = stewpot();
const router = useRouter();

function resolvePromiseAfter5Seconds() {
  return new Promise((resolve, reject) => {
    try {
      setTimeout(() => resolve('resolved!'), 5000);
    } catch (err) {
      reject(`Something went during resolving of promise: ${err}`);
    }
  });
}

router.get('root', async (_, response) => {
  const promiseResult = await resolvePromiseAfter5Seconds();
  response.end(promiseResult);
});

app.use(router.route);

app.run();
