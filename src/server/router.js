export const routes = [];

export function hasURL(url) {
  const matches = routes.filter(route => (
    url === route.url
  ));

  const len = matches.length;

  return len > 0;
}

export function add(method='GET', url='/', callback) {
  const duplicates = routes.filter(route => (
    route.method === method.toUpperCase() &&
    route.url === url
  ));

  console.log('duplicates', duplicates);

  return (duplicates.length === 0) ? 
  (
    routes.push({
      method: method.toUpperCase(),
      url,
      callback
    })
  ) : 
  false;
}

export function clear() {

}
