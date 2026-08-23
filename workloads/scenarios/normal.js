import { sleep } from 'k6';
import { check } from 'k6';
import { getHealth, listUsers, createUser, getUser, generateRandomId } from '../lib/users.js';
import { getCache } from '../lib/cache.js';
import { is200, is201, is404 } from '../lib/checks.js';
import { request } from '../lib/client.js';

const config = JSON.parse(open('../config/normal.json'));

export const options = {
    vus: config.vus,
    duration: config.duration,
};

// State for cache hits
let createdUserId = null;

export default function () {
    const r = Math.random() * 100;
    const dist = config.distribution;
    
    let cumulative = dist.health;
    if (r < cumulative) {
        check(getHealth(), { 'status is 200': is200 });
        sleep(1);
        return;
    }
    
    cumulative += dist.listUsers;
    if (r < cumulative) {
        check(listUsers(), { 'status is 200': is200 });
        sleep(1);
        return;
    }
    
    cumulative += dist.createUser;
    if (r < cumulative) {
        const res = createUser();
        check(res, { 'status is 201': is201 });
        if (res.status === 201) {
            createdUserId = res.json('id');
        }
        sleep(1);
        return;
    }
    
    cumulative += dist.getUserHit;
    if (r < cumulative) {
        if (createdUserId) {
            check(getUser(createdUserId), { 'status is 200': is200 });
        } else {
            // Fallback if no user created by this VU yet
            check(getHealth(), { 'status is 200': is200 });
        }
        sleep(1);
        return;
    }
    
    cumulative += dist.getUserMiss;
    if (r < cumulative) {
        // Random UUID will trigger cache miss and DB hit (usually leading to 404)
        check(getUser(generateRandomId()), { 'status is 404': is404 });
        sleep(1);
        return;
    }

    cumulative += dist.cacheMiss;
    if (r < cumulative) {
        check(getCache(), { 'status is 200': is200 });
        sleep(1);
        return;
    }
    
    // Invalid request
    const res = request('GET', '/users/invalid-id-format');
    check(res, { 'status is 500 or 400': (r) => r.status >= 400 });
    sleep(1);
}
