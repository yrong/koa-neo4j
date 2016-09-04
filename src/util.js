/**
 * Created by keyvan on 8/22/16.
 */


import http from 'http';

function * keyValues(obj) {
    for (const key of Object.keys(obj))
        yield [key, obj[key]];
}

const haveIntersection = (arrayFirst, arraySecond) => {
    if (!arrayFirst || !arraySecond)
        return false;
    const first = new Set(arrayFirst);
    const second = new Set(arraySecond);
    for (const element of first)
        if (second.has(element))
            return true;
    return false;
};

const readMissingFromDefault = (obj, defaultValues) => {
    if (!obj)
        return Object.assign({}, defaultValues);
    const result = {};
    for (const [key, value] of keyValues(defaultValues))
        result[key] = obj[key] ? obj[key] : value;
    return result;
};

function * enumerate(array) {
    let index = 0;
    for (const element of array) {
        yield [index, element];
        index++;
    }
}

const pipe = (...functions) => (...args) => {
    for (const func of functions)
        if (Array.isArray(args))
            args = func.apply(this, args);
        else
            args = func.apply(this, [args]);
    return args;
};

const httpGet = (route, port) => (new Promise((resolve, reject) =>
    http.get(`http://localhost:${port}${route}`, resolve).on('error', reject)))
    .then(response => new Promise((resolve, reject) => response.on('data', resolve)))
    .then(chunk => chunk.toString('utf8'));

const httpCall = (method, host, route, port, data, headers) => {
    return (new Promise((resolve, reject) => {
        data = data || {};
        headers = headers || {};
        if (!headers['Content-Type']) {
            data = JSON.stringify(data);
            headers = {...headers, ...{'Content-Type': 'application/json'}};
        }
        const request = http.request({
            hostname: host,
            port: port,
            path: route,
            method: method,
            headers: headers
        }, resolve);
        request.on('error', reject);
        request.end(data);
    }))
        .then(response => { response.setEncoding('utf8'); return response; })
        .then(response => new Promise(resolve => response.on('data', resolve)))
        .then(chunk => chunk.toString('utf8'));
};

const httpPost = (route, port, data, headers) =>
    httpCall('POST', 'localhost', route, port, data, headers);


export {keyValues, haveIntersection, readMissingFromDefault,
    enumerate, pipe, httpGet, httpPost, httpCall};
