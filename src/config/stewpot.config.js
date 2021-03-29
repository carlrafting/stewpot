export default () => {
  return {
    server: {
      host: 'localhost',
      port: 80
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
