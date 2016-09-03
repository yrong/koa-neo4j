/**
 * Created by keyvan on 8/31/16.
 */

import http from 'http';
import path from 'path';

const cypherQueryFilePathFor = fileName =>
    `.${path.join(__dirname, '../../cypher/tests/')}${fileName}.cyp`;

const httpGet = (route, port) => (new Promise((resolve, reject) =>
    http.get(`http://localhost:${port}${route}`, resolve).on('error', reject)))
    .then(response => new Promise((resolve, reject) => response.on('data', resolve)))
    .then(chunk => chunk.toString('utf8'));

const httpCall = (method) => (route, port, data) => {
    let request;
    return (new Promise((resolve, reject) => {
        data = data || {};
        data = JSON.stringify(data);
        request = http.request({
            hostname: 'localhost',
            port: port,
            path: route,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        }, resolve);
        request.on('error', reject);
        request.end(data);
    }))
        .then(response => { response.setEncoding('utf8'); return response; })
        .then(response => new Promise(resolve => response.on('data', resolve)))
        .then(chunk => chunk.toString('utf8'));
};

const httpPost = httpCall('POST');

export {cypherQueryFilePathFor, httpGet, httpPost};
