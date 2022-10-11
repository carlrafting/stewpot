import { URL } from 'node:url';

/**
 * @description
 *
 * Copied from the node.js documentation
 *
 * @example
 *
 * resolve('/one/two/three', 'four');         // '/one/two/four'
 * resolve('http://example.com/', '/one');    // 'http://example.com/one'
 * resolve('http://example.com/one', '/two'); // 'http://example.com/two'
 *
 * @url https://nodejs.org/dist/latest-v16.x/docs/api/url.html#urlresolvefrom-to
 * @param {string} from url to resolve from
 * @param {string} to url to resolve to
 * @returns {string}
 */
export function resolve(from, to) {
    const resolvedUrl = new URL(to, new URL(from, 'resolve://'));

    if (resolvedUrl.protocol === 'resolve:') {
        // `from` is a relative URL.
        const { pathname, search, hash } = resolvedUrl;
        return pathname + search + hash;
    }

    return resolvedUrl.toString();
}

export function parse(req) {
    // console.log(req);
    return new URL(req.url, `http://${req.headers.host}`);
}
