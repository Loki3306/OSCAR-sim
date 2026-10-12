import { request } from './client.js';

export function createUser() {
    const payload = JSON.stringify({
        name: `User_${Math.floor(Math.random() * 100000)}`,
        email: `user${Math.floor(Math.random() * 100000)}@example.com`
    });
    return request('POST', '/users', payload);
}

export function listUsers() {
    return request('GET', '/users');
}

export function getUser(id) {
    return request('GET', `/users/${id}`);
}

export function getHealth() {
    return request('GET', '/health');
}

// Generate a random UUID
export function generateRandomId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
