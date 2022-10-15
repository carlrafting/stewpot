export class HttpError extends Error {
    statusCode;

    constructor(code, message) {
        super(message);
        this.statusCode = code;
    }
}

export function createError(code, message) {
    return new HttpError(code, message);
}

export const isError = (err) =>
    err instanceof Error || err instanceof HttpError;
