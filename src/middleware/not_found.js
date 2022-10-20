/* eslint-disable */
import { Status } from '../../deps.js';

export default function notFound(context) {
    context.response.status = Status.NotFound;
    context.response.body = `<html><body><h1>404 - Not Found</h1><p>Path <code>${context.request.url}</code> not found.`;
}
