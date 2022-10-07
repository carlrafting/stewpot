import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

export function notFound(_, res) {
    res.writeHead(404, {
        'Content-Type': 'text/plain',
    });
    res.end('404 Not Found!');
}

export function onError(err, req, res, next) {
    console.log(err);
    res.end();
}

export function json(req, res, data = {}) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

export function text(req, res, text = '') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(text);
}

export async function html(req, res, html, data = {}) {
    res.writeHead(200, { 'Content-Type': 'text/html' });

    let template = typeof html === 'string' ? html : '';

    if (typeof html === 'object' && html.template) {
        try {
            template = await readFile(
                join(process.cwd(), 'src', 'templates', html.template),
                { encoding: 'utf-8' }
            );
            console.log(template);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(err.message);
            return;
        }
    }

    if (Object.keys(data).length > 0) {
        for (const [key, value] of Object.entries(data)) {
            template = template.replaceAll(`{${key}}`, value);
        }
    }

    res.end(template);
}
