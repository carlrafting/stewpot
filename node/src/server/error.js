import { STATUS_CODES } from 'node:http';

export class HttpError extends Error {
    statusCode;

    constructor(code, message) {
        super(message);
        this.statusCode = code;
    }
}

export function createError(code = 500, message = STATUS_CODES[code]) {
    return new HttpError(code, message);
}

export const isError = (err) =>
    err instanceof Error || err instanceof HttpError;

export const notFoundError = (message) => {
    return new createError(404, message);
};
