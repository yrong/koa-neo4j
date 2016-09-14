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

const readMissingFromDefault = (object, defaultValues) => {
    if (!object)
        return Object.assign({}, defaultValues);
    return {...defaultValues, ...object};
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
        .then(chunk => chunk.toString('utf8'));
        // TODO below causes tests to fail!
        // .then(str => {
        //     try {
        //         console.log(str)
        //         return JSON.parse(str);
        //     } catch (error) {
        //         return str;
        //     }
        // });
};

const httpGet = (route, port) => httpCall('GET', 'localhost', route, port);

const httpPost = (route, port, data, headers) =>
    httpCall('POST', 'localhost', route, port, data, headers);


export {keyValues, haveIntersection, readMissingFromDefault,
    enumerate, pipe, httpGet, httpPost, httpCall};
