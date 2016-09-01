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

const httpPost = (route, port, data) => {
    let request;
    (new Promise((resolve, reject) => {
        request = http.request({
            hotname: 'localhost',
            port: port,
            path: route,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, resolve).on('error', reject);
    }))
        .then(response => new Promise((resolve, reject) => response.on('data', resolve)))
        .then(chunk => chunk.toString('utf8'))
        .then(() => request.end());
}

export {cypherQueryFilePathFor, httpGet, httpPost};
