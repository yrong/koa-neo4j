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

export {cypherQueryFilePathFor, httpGet};
