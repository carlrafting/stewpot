import stewpot from 'stewpot/app';

const first = stewpot({ port: 8081 });
const second = stewpot({ port: 8082 });

first.use((_, response) => {
    response.end('hello from localhost:8081');
});
first.run();

second.use((_, response) => {
    response.end('hello from localhost:8082');
});
second.run();
