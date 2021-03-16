export default (options={}) => {
  // const defaultConfig = {};

  const config = {
    ...options
  };

  let initilaized = false;
  const routes = new Map();

  if (!initilaized) {
    initilaized = true;
  }

  const isInitialized = () => {
    if (!initilaized) {
      throw new Error('Router was not initialized!');
    }
  };

  function add(name, method='GET', url='/', callback=()=>{}) {
    isInitialized();

    if (!routes.has(name)) {
      routes.set(name, {
        method: method.toUpperCase(),
        url,
        callback
      });

      return true;
    }

    return false;
  }

  function get(name, url='/', callback=()=>{}) {
    return add(name, 'GET', url, callback);
  }

  function post(name, url='/', callback=()=>{}) {
    return add(name, 'POST', url, callback);
  }
  
  function clear() {
    isInitialized();
    routes.clear();
  }

  return Object.freeze({
    config,
    routes() {
      return routes;
    },
    add,
    get,
    post,
    clear
  });
};

