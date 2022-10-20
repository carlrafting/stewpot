export default () => {
    return {
        server: {
            host: 'localhost',
            port: 8080,
            // port: 443,
            // https: {
            //   certFile: 'config/localhost.crt',
            //   keyFile: 'config/localhost.key',
            // },
        },
        watch: {
            src: '/assets',
            public: {
                url: '/',
                build: false,
            },
        },
    };
};
