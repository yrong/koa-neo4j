/**
 * Created by keyvan on 8/22/16.
 */


import http from 'http';

const contains = (iterable, element) => {
    for (const arrayElement of iterable)
        if (element === arrayElement)
            return true;
    return false;
};

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

const pipe = (...functions) => (...args) => {
    for (const func of functions)
        if (Array.isArray(args))
            args = func.apply(this, args);
        else
            args = func.apply(this, [args]);
    return args;
};

const compareFnFromArray = (array, fn) => (first, second) => {
    if (!fn)
        fn = x => x;
    first = fn.apply(null, [first]);
    second = fn.apply(null, [second]);
    first = array.indexOf(first);
    second = array.indexOf(second);
    return first - second;
};

const areSameDay = (dateFirst, dateSecond) =>
    dateFirst.getFullYear() === dateSecond.getFullYear() &&
    dateFirst.getMonth() === dateSecond.getMonth() &&
    dateFirst.getDate() === dateSecond.getDate();

const httpCall = (method, host, route, port, data, headers) => {
    return (new Promise((resolve, reject) => {
        headers = headers || {};
        if (typeof data === 'object') {
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
        .then(chunk => chunk.toString('utf8'))
        .then(str => {
            try {
                return JSON.parse(str);
            } catch (error) {
                return str;
            }
        });
};

const httpGet = (route, port) => httpCall('GET', 'localhost', route, port);

const httpPost = (route, port, data, headers) =>
    httpCall('POST', 'localhost', route, port, data, headers);

export {keyValues, enumerate, zip} from 'pythonic';
export {haveIntersection, pipe, compareFnFromArray,
    areSameDay, httpGet, httpPost, httpCall, contains};
