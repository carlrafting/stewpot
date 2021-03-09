export default () => {
  return {
    server: {
      hostname: "localhost",
      port: 443,
      https: {
        certFile: "config/localhost.crt",
        keyFile: "config/localhost.key",
      },
    },
    watch: {
      src: "/assets",
      public: {
        url: "/",
        build: false,
      },
    },
  };
};
