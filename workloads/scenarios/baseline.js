import { sleep } from 'k6';
import { getHealth, listUsers } from '../lib/users.js';
import { is200 } from '../lib/checks.js';
import { check } from 'k6';

const config = JSON.parse(open('../config/baseline.json'));

export const options = {
    vus: config.vus,
    duration: config.duration,
};

export default function () {
    const r = Math.random() * 100;
    let res;
    if (r < config.distribution.health) {
        res = getHealth();
        check(res, { 'status is 200': is200 });
    } else {
        res = listUsers();
        check(res, { 'status is 200': is200 });
    }
    
    sleep(1);
}
