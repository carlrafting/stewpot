export default (options={}) => {
  // const defaultConfig = {};

  const config = {
    ...options
  };

  const routes = new Map();

  function add(name, method='GET', url='/', callback=()=>{}) {
    const route = routes.get(name);
    
    if (route && route.method === method) {
      throw new Error(`There is already a route with that method!`);
    }
    
    routes.set(name, {
      method: method.toUpperCase(),
      url,
      callback
    });

    // throw new Error(`Route ${name} already exists!`);
  }

  function get(name, url='/', callback=()=>{}) {
    return add(name, 'GET', url, callback);
  }

  function post(name, url='/', callback=()=>{}) {
    return add(name, 'POST', url, callback);
  }
  
  function clear() {
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

