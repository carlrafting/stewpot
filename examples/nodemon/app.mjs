import stewpot from 'stewpot/app';

const app = stewpot();

app.use((_, response) => {
    response.end('<h1>Hello Nodemon!</h1>');
});
app.run();
