import chalk from 'chalk';

export function logger(response, request, next) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] - ${chalk.bold(response.statusCode)} - ${chalk.blue(request.method)} - ${chalk.white(request.url)}`);
  next && next();
}
