import { request } from './client.js';

export function getCache() {
    // This intentionally triggers a cache miss by hitting the /cache endpoint 
    // which queries a nil UUID in Redis.
    return request('GET', '/cache');
}
