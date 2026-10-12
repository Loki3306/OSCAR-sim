import http from 'k6/http';
import { Trend, Counter } from 'k6/metrics';

// Custom metrics to track specific operations if needed,
// though Prometheus will track the real metrics.
const reqDuration = new Trend('custom_req_duration');
const reqErrors = new Counter('custom_req_errors');

export const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8080';

export function request(method, path, body = null, params = {}) {
    const url = `${BASE_URL}${path}`;
    
    // Inject default headers
    const defaultParams = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        ...params
    };

    let res;
    if (method === 'GET') {
        res = http.get(url, defaultParams);
    } else if (method === 'POST') {
        res = http.post(url, body, defaultParams);
    } else {
        throw new Error(`Method ${method} not supported in client wrapper`);
    }

    // Record k6 internal metrics
    reqDuration.add(res.timings.duration, { path: path, method: method });
    
    if (res.status >= 400 && res.status !== 404) {
        // We might generate intentional 404s, so 404 isn't strictly an error for the generator,
        // but 5xx definitely is.
        reqErrors.add(1, { path: path, method: method });
    }

    return res;
}
