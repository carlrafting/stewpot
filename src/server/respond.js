import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import mime from './mime.js';

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

export function notFound(_, res) {
    res.writeHead(404, {
        'Content-Type': 'text/plain',
    });
    res.end('404 Not Found!');
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
    // res.writeHead(200, { 'Content-Type': 'text/html' });
    headers(res, 'html');

    let template = typeof html === 'string' ? html : '';

    if (typeof html === 'object' && html.template) {
        try {
            template = await readFile(
                join(process.cwd(), 'src', 'templates', html.template),
                { encoding: 'utf-8' }
            );
        } catch (err) {
            // res.writeHead(500, { 'Content-Type': mime.html });
            headers(res, 500, 'html');
            res.end(err.message);
            return;
        }
    }

    if (Object.keys(data).length > 0) {
        for (const [key, value] of Object.entries(data)) {
            template = template.replaceAll(`{{ ${key} }}`, value);
        }
    }

    res.end(template);
}
