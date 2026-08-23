export function is200(res) {
    return res.status === 200;
}

export function is201(res) {
    return res.status === 201;
}

export function is404(res) {
    return res.status === 404;
}

export function isSuccessful(res) {
    return res.status >= 200 && res.status < 300;
}
