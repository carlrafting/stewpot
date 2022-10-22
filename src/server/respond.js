const APP_ENV = process.env.NODE_ENV || 'production';
import { join, dirname } from 'node:path';
import { readFile } from 'node:fs/promises';
import mime from './mime.js';
import { fileURLToPath } from 'node:url';

export const TYPE = 'Content-Type';

/**
 * @example
 *
 * // set header content type html with 200 status code and no additional headers
 * headers(res, 'html');
 *
 * // set header content type to html with 500 status code and no additional headers
 * headers(res, 500, 'html');
 *
 * // set header content type to html with 301 status code and with additional location header
 * headers(res, 301, 'html', { Location: '/' })
 *
 * @param {ServerResponse} res
 * @param {array} args - code, headers or format
 * @param {number} args.code - response status code
 * @param {object} args.headers - response headers
 * @param {string} args.format - response mime type
 * @returns {undefined}
 */
export function headers(res, ...args) {
    let code = 200,
        headers = {},
        format = 'default';

    if (args.length > 0) {
        for (const arg of args) {
            code = typeof arg === 'number' ? arg : code;
            headers = typeof arg === 'object' ? arg : headers;
            format = typeof arg === 'string' ? arg : format;
        }
    }

    res.writeHead(code, { [TYPE]: mime[format], ...headers });
}

/**
 * @example
 *
 * redirect(res, '/foo');
 *
 * redirect(res, '/foo', 302);
 *
 * @param {OutgoingMessage} res
 * @param {string} location
 * @param  {number} code
 * @returns {undefined}
 */
export function redirect(res, location = '/', code = 301) {
    headers(res, code, { location });
}

export async function notFound(err, _, res) {
    const __dirname = dirname(fileURLToPath(import.meta.url));

    let styles;

    try {
        styles = await readFile(
            join(__dirname, '..', 'static', 'styles.css'),
            'utf-8'
        );
    } catch (err) {
        styles = '';
    }

    headers(res, err.code || 404, 'html');
    res.end(
        `
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${err.message}</title>
<style>${styles}</style>
<header>
<h1>${err.statusCode} ${err.message}</h1>
<p>Stewpot wasn't able to find any matches for <code>${_.url}</code>.
</header>
${
    APP_ENV === 'development'
        ? `
<main>
<pre>${err.stack}</pre>
</main>
`
        : ''
}
        `.trim()
    );
}

export function onError(err, req, res) {
    console.log(err);
    res.end();
}

export function json(req, res, data = {}) {
    // res.writeHead(200, { 'Content-Type': 'application/json' });
    headers(res, 200, 'json');
    res.end(JSON.stringify(data));
}

export function text(req, res, text = '') {
    // res.writeHead(200, { 'Content-Type': 'text/plain' });
    headers(res, 200, 'txt');
    res.end(text);
}

/**
 * 
 * @example
 *
    // template string
    html(req, res, (
        `<!doctype html>
        <meta charset="utf-8">
        <title>Hello World!</title>
        <h1>Hello World!</h1>`
    ));

    // template string with data
    html(req, res, (
        `<!doctype html>
        <meta charset="utf-8">
        <title>{title}</title>
        <h1>{title}</h1>
        <p>{text}</p>`
    ), { title: 'Hello World', text: 'This is some text!' });

    // template file
    html(req, res, {
        template: 'index.html'
    });
 
 * @param {IncomingMessage} req - node.js request object
 * @param {ServerResponse} res - node.js response object
 * @param {string|object} html 
 * @param {string} html - template html string
 * @param {string} html.template - path to template file (relative to template directory)
 * @param {object} data - data for html template file or string
 * @returns {undefined}
 */
export async function html(req, res, html, data = {}) {
    headers(res, 'html');

    let template = typeof html === 'string' ? html : '';
    let path = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates');

    if (typeof html === 'object') {
        if (html.path) {
            path = join(process.cwd(), html.path);
        }

        if (html.template) {
            try {
                template = await readFile(join(path, html.template), {
                    encoding: 'utf-8',
                });
            } catch (err) {
                headers(res, 500, 'html');
                res.end(err.message);
                return;
            }
        }
    }

    if (Object.keys(data).length > 0) {
        for (const [key, value] of Object.entries(data)) {
            template = template.replaceAll(`{{ ${key} }}`, value);
        }
    }

    res.end(template);
}
